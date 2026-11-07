import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { createAdminClient } from '@/lib/supabase/admin';

interface ExpoPushTicket {
  status: 'ok' | 'error';
  id?: string;
  message?: string;
  details?: {
    error?: 'DeviceNotRegistered' | 'MessageTooBig' | 'MessageRateExceeded' | 'InvalidCredentials' | string;
  };
}

export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const announcementId = params.id;
    if (!announcementId) {
      return NextResponse.json({ error: 'Announcement ID is required' }, { status: 400 });
    }

    // 1. Authenticate user & verify admin rights
    const userSupabase = await createClient();
    const {
      data: { user },
      error: userErr,
    } = await userSupabase.auth.getUser();

    if (userErr || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { data: adminRecord } = await userSupabase
      .from('admins')
      .select('user_id')
      .eq('user_id', user.id)
      .maybeSingle();

    if (!adminRecord) {
      return NextResponse.json({ error: 'Forbidden: Admin access required' }, { status: 403 });
    }

    // 2. Privilege escalation via service role client
    const adminSupabase = createAdminClient();

    // 3. Load announcement
    const { data: announcement, error: fetchErr } = await adminSupabase
      .from('announcements')
      .select('*')
      .eq('id', announcementId)
      .single();

    if (fetchErr || !announcement) {
      return NextResponse.json({ error: 'Announcement not found' }, { status: 404 });
    }

    if (!announcement.is_published) {
      return NextResponse.json(
        { error: 'Cannot send push for an unpublished announcement' },
        { status: 400 }
      );
    }

    if (!announcement.push_requested) {
      return NextResponse.json(
        { error: 'Push notification was not requested for this announcement' },
        { status: 400 }
      );
    }

    // Check if optional resend query flag is passed
    const url = new URL(request.url);
    const forceResend = url.searchParams.get('resend') === 'true';

    // Idempotency check: don't double-send unless explicitly requested
    if (announcement.push_sent_at && !forceResend) {
      return NextResponse.json({
        success: true,
        message: 'Push notification was already sent',
        alreadySent: true,
        sentAt: announcement.push_sent_at,
      });
    }

    // 4. Load target registered devices
    const { data: devices, error: devicesErr } = await adminSupabase
      .from('devices')
      .select('expo_push_token, platform, language');

    if (devicesErr) {
      return NextResponse.json(
        { error: `Failed to load devices: ${devicesErr.message}` },
        { status: 500 }
      );
    }

    if (!devices || devices.length === 0) {
      // Mark as sent even if 0 devices are registered yet
      await adminSupabase
        .from('announcements')
        .update({ push_sent_at: new Date().toISOString() })
        .eq('id', announcement.id);

      return NextResponse.json({
        success: true,
        sentCount: 0,
        message: 'No registered devices found',
      });
    }

    // 5. Construct payload messages grouped by recipient language
    const messages = devices.map((device) => {
      const isTamil = device.language === 'ta';
      const title = isTamil
        ? announcement.title_ta || announcement.title_en || 'மஸ்ஜிதுல் இஹ்சான்'
        : announcement.title_en || announcement.title_ta || 'Masjidul Ihsaan';

      const body = isTamil
        ? announcement.body_ta || announcement.body_en || ''
        : announcement.body_en || announcement.body_ta || '';

      return {
        to: device.expo_push_token,
        sound: 'default',
        title,
        body,
        channelId: 'announcements',
        priority: 'high',
        data: {
          announcementId: announcement.id,
          category: announcement.category,
        },
      };
    });

    // 6. Chunk messages into batches of 100 for Expo Push API
    const chunkSize = 100;
    const invalidTokens: string[] = [];
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      Accept: 'application/json',
      'Accept-Encoding': 'gzip, deflate',
    };

    if (process.env.EXPO_ACCESS_TOKEN) {
      headers['Authorization'] = `Bearer ${process.env.EXPO_ACCESS_TOKEN}`;
    }

    for (let i = 0; i < messages.length; i += chunkSize) {
      const chunk = messages.slice(i, i + chunkSize);
      try {
        const expoRes = await fetch('https://exp.host/--/api/v2/push/send', {
          method: 'POST',
          headers,
          body: JSON.stringify(chunk),
        });

        if (expoRes.ok) {
          const resData = await expoRes.json();
          const tickets: ExpoPushTicket[] = resData.data || [];

          tickets.forEach((ticket, idx) => {
            if (
              ticket.status === 'error' &&
              ticket.details?.error === 'DeviceNotRegistered'
            ) {
              const badToken = chunk[idx]?.to;
              if (badToken) invalidTokens.push(badToken);
            }
          });
        }
      } catch (postErr) {
        console.error('Failed sending push chunk to Expo:', postErr);
      }
    }

    // 7. Cleanup unregistered tokens
    if (invalidTokens.length > 0) {
      await adminSupabase
        .from('devices')
        .delete()
        .in('expo_push_token', invalidTokens);
    }

    // 8. Update push_sent_at timestamp
    const nowIso = new Date().toISOString();
    await adminSupabase
      .from('announcements')
      .update({ push_sent_at: nowIso, updated_at: nowIso })
      .eq('id', announcement.id);

    return NextResponse.json({
      success: true,
      sentCount: messages.length,
      invalidRemoved: invalidTokens.length,
      sentAt: nowIso,
    });
  } catch (err: any) {
    return NextResponse.json(
      { error: err?.message || 'Internal server error' },
      { status: 500 }
    );
  }
}
