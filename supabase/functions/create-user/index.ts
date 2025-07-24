
import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
      {
        auth: {
          autoRefreshToken: false,
          persistSession: false
        }
      }
    )

    const authHeader = req.headers.get('Authorization')!
    const token = authHeader.replace('Bearer ', '')
    
    // Vérifier l'utilisateur authentifié
    const { data: { user }, error: userError } = await supabaseAdmin.auth.getUser(token)
    
    if (userError || !user) {
      console.error('Auth error:', userError)
      return new Response(
        JSON.stringify({ error: 'Non authentifié' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Vérifier que l'utilisateur actuel est super_admin
    const { data: currentUser, error: currentUserError } = await supabaseAdmin
      .from('users')
      .select('role')
      .eq('id', user.id)
      .single()

    if (currentUserError || !currentUser || currentUser.role !== 'super_admin') {
      console.error('Permission error:', currentUserError, currentUser)
      return new Response(
        JSON.stringify({ error: 'Permission refusée' }),
        { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    const { email, password, full_name, role, tenant_id } = await req.json()

    console.log('Creating user with data:', { email, full_name, role, tenant_id })

    // Créer l'utilisateur dans Supabase Auth
    const { data: authUser, error: authError } = await supabaseAdmin.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
      user_metadata: {
        full_name,
      }
    })

    if (authError) {
      console.error('Auth creation error:', authError)
      return new Response(
        JSON.stringify({ error: authError.message }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    console.log('Auth user created:', authUser.user.id)

    // Créer le profil utilisateur
    const { error: profileError } = await supabaseAdmin
      .from('users')
      .insert([{
        id: authUser.user.id,
        full_name,
        email,
        role,
        tenant_id: tenant_id || null,
      }])

    if (profileError) {
      console.error('Profile creation error:', profileError)
      // Si la création du profil échoue, supprimer l'utilisateur Auth
      await supabaseAdmin.auth.admin.deleteUser(authUser.user.id)
      return new Response(
        JSON.stringify({ error: profileError.message }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    console.log('User profile created successfully')

    return new Response(
      JSON.stringify({ user: authUser.user }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )

  } catch (error) {
    console.error('Unexpected error:', error)
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }
})
