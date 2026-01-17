import { supabase } from '../lib/supabase';
import type { User } from '../types/auth';

export async function signInWithMagicLink(email: string): Promise<{ error: Error | null }> {
  try {
    const { data: userData } = await supabase
      .from('users')
      .select('status')
      .eq('email', email)
      .maybeSingle();

    if (userData && userData.status === 'pending') {
      return { error: new Error('Your account is pending approval. An administrator will review your request.') };
    }

    const { error } = await supabase.auth.signInWithOtp({
      email,
      options: {
        emailRedirectTo: window.location.origin,
      },
    });

    if (error) throw error;
    return { error: null };
  } catch (error) {
    return { error: error as Error };
  }
}

export async function signInWithPassword(email: string, password: string): Promise<{ error: Error | null }> {
  try {
    const { data: userData } = await supabase
      .from('users')
      .select('status')
      .eq('email', email)
      .maybeSingle();

    if (userData && userData.status === 'pending') {
      return { error: new Error('Your account is pending approval. An administrator will review your request.') };
    }

    const { error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (error) throw error;
    return { error: null };
  } catch (error) {
    return { error: error as Error };
  }
}

export async function signOut(): Promise<{ error: Error | null }> {
  try {
    const { error } = await supabase.auth.signOut();
    if (error) throw error;
    return { error: null };
  } catch (error) {
    return { error: error as Error };
  }
}

export async function getCurrentUser(): Promise<User | null> {
  try {
    const { data: { user: authUser } } = await supabase.auth.getUser();

    if (!authUser) return null;

    const { data: userData, error } = await supabase
      .from('users')
      .select('*')
      .eq('id', authUser.id)
      .maybeSingle();

    if (error) throw error;

    if (userData && userData.status === 'pending') {
      await supabase.auth.signOut();
      return null;
    }

    return userData;
  } catch (error) {
    console.error('Error fetching user:', error);
    return null;
  }
}

export async function createUser(email: string, password: string, role: string): Promise<{ error: Error | null }> {
  try {
    const { data: authData, error: authError } = await supabase.auth.signUp({
      email,
      password,
    });

    if (authError) throw authError;
    if (!authData.user) throw new Error('User creation failed');

    const { error: updateError } = await supabase
      .from('users')
      .update({ role, status: 'approved' })
      .eq('id', authData.user.id);

    if (updateError) throw updateError;

    return { error: null };
  } catch (error) {
    return { error: error as Error };
  }
}

export async function updateUserRole(userId: string, role: string): Promise<{ error: Error | null }> {
  try {
    const { error } = await supabase
      .from('users')
      .update({ role })
      .eq('id', userId);

    if (error) throw error;
    return { error: null };
  } catch (error) {
    return { error: error as Error };
  }
}

export async function getAllUsers(): Promise<{ data: User[] | null; error: Error | null }> {
  try {
    const { data, error } = await supabase
      .from('users')
      .select('*')
      .order('created_at', { ascending: false });

    if (error) throw error;
    return { data, error: null };
  } catch (error) {
    return { data: null, error: error as Error };
  }
}

export async function deleteUser(userId: string): Promise<{ error: Error | null }> {
  try {
    const { error } = await supabase.auth.admin.deleteUser(userId);
    if (error) throw error;
    return { error: null };
  } catch (error) {
    return { error: error as Error };
  }
}
