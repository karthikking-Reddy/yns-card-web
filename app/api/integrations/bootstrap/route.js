import {
  NextResponse,
} from 'next/server';

import {
  requireUser,
  supabaseAdmin,
} from '../../../../lib/supabaseAdmin';


export async function POST(
  request
) {
  try {
    const user =
      await requireUser(
        request
      );


    const providers = [
      'meta',
      'whatsapp',
    ];


    for (
      const provider of providers
    ) {
      const {
        data: existing,
        error:
          existingError,
      } =
        await supabaseAdmin
          .from(
            'integration_connections'
          )
          .select('id')
          .eq(
            'user_id',
            user.id
          )
          .eq(
            'provider',
            provider
          )
          .maybeSingle();


      if (existingError) {
        throw existingError;
      }


      if (!existing) {
        const {
          error:
            insertError,
        } =
          await supabaseAdmin
            .from(
              'integration_connections'
            )
            .insert({
              user_id:
                user.id,

              provider,

              status:
                'disconnected',

              metadata: {},
            });


        if (insertError) {
          throw insertError;
        }
      }
    }


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
          connected_at,
          last_synced_at
        `)
        .eq(
          'user_id',
          user.id
        )
        .order(
          'provider'
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
      'Integration bootstrap error:',
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
          'Unable to prepare integrations.',
      },
      {
        status: 500,
      }
    );
  }
}
