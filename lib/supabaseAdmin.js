import 'server-only';

import {
  createClient,
} from '@supabase/supabase-js';


const supabaseUrl =
  process.env.NEXT_PUBLIC_SUPABASE_URL;

const supabaseSecretKey =
  process.env.SUPABASE_SECRET_KEY;


if (!supabaseUrl) {
  throw new Error(
    'Missing NEXT_PUBLIC_SUPABASE_URL.'
  );
}


if (!supabaseSecretKey) {
  throw new Error(
    'Missing SUPABASE_SECRET_KEY.'
  );
}


export const supabaseAdmin =
  createClient(
    supabaseUrl,
    supabaseSecretKey,
    {
      auth: {
        persistSession: false,
        autoRefreshToken: false,
        detectSessionInUrl: false,
      },
    }
  );


export async function requireUser(
  request
) {
  const authorization =
    request.headers.get(
      'authorization'
    ) || '';

  if (
    !authorization.startsWith(
      'Bearer '
    )
  ) {
    throw new Error(
      'UNAUTHORIZED'
    );
  }


  const token =
    authorization
      .slice(7)
      .trim();


  if (!token) {
    throw new Error(
      'UNAUTHORIZED'
    );
  }


  const {
    data,
    error,
  } =
    await supabaseAdmin.auth.getUser(
      token
    );


  if (
    error ||
    !data?.user
  ) {
    throw new Error(
      'UNAUTHORIZED'
    );
  }


  return data.user;
}
