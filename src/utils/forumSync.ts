import { supabase, forumsClient, type Forum } from '../lib/supabase';

interface SyncResult {
  success: boolean;
  error?: string;
  forum?: Forum;
}

export async function syncForumToLocal(forumId: string): Promise<SyncResult> {
  try {
    const { data: externalForum, error: fetchError } = await forumsClient
      .from('forums')
      .select('*')
      .eq('id', forumId)
      .maybeSingle();

    if (fetchError) {
      console.error('Error fetching forum from external database:', fetchError);
      return { success: false, error: 'Failed to fetch forum from external database' };
    }

    if (!externalForum) {
      console.error('Forum not found in external database:', forumId);
      return { success: false, error: 'Forum not found in external database' };
    }

    const { error: upsertError } = await supabase
      .from('forums')
      .upsert({
        id: externalForum.id,
        name: externalForum.name,
        brand: externalForum.brand,
        date: externalForum.date,
        city: externalForum.city,
        venue: externalForum.venue,
        updated_at: new Date().toISOString()
      }, {
        onConflict: 'id'
      });

    if (upsertError) {
      console.error('Error syncing forum to local database:', upsertError);
      return { success: false, error: 'Failed to sync forum to local database' };
    }

    return { success: true, forum: externalForum };
  } catch (err) {
    console.error('Unexpected error during forum sync:', err);
    return { success: false, error: err instanceof Error ? err.message : 'Unexpected error occurred' };
  }
}
