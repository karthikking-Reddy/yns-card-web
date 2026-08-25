import {
  NextResponse,
} from 'next/server';

import {
  requireUser,
  supabaseAdmin,
} from '../../../../lib/supabaseAdmin';


export async function GET(
  request
) {
  try {
    const user =
      await requireUser(
        request
      );


    const {
      data,
      error,
    } =
      await supabaseAdmin
        .from(
          'integration_connections'
        )
        .select(`
          id,
          provider,
          status,
          display_name,
          external_business_id,
          external_page_id,
          external_ad_account_id,
          external_waba_id,
          external_phone_number_id,
          scopes,
          metadata,
          connected_at,
          last_synced_at,
          created_at,
          updated_at
        `)
        .eq(
          'user_id',
          user.id
        )
        .order(
          'provider',
          {
            ascending: true,
          }
        );


    if (error) {
      throw error;
    }


    return NextResponse.json(
      {
        ok: true,
        connections:
          data || [],
      }
    );
  } catch (error) {
    console.error(
      'Integration status error:',
      error
    );


    if (
      error?.message ===
      'UNAUTHORIZED'
    ) {
      return NextResponse.json(
        {
          ok: false,
          error:
            'Unauthorized',
        },
        {
          status: 401,
        }
      );
    }


    return NextResponse.json(
      {
        ok: false,
        error:
          error?.message ||
          'Unable to load integrations.',
      },
      {
        status: 500,
      }
    );
  }
}
