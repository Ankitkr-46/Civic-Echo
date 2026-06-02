import { NextResponse } from 'next/server';
import { createServerSupabase } from '@/lib/supabase';

type ParamsInput = Promise<{ id: string }> | { id: string };

export async function GET(
  request: Request,
  { params }: { params: ParamsInput }
) {
  try {
    const resolvedParams = await params;
    const { id } = resolvedParams;
    const supabase = createServerSupabase();

    // 1. Fetch complaint details
    const { data: complaint, error: compError } = await supabase
      .from('complaints')
      .select(`
        *,
        citizen:profiles!citizen_id(full_name, phone)
      `)
      .eq('id', id)
      .single();

    if (compError) {
      return NextResponse.json({ error: compError.message }, { status: 404 });
    }

    // 2. Fetch comments with profiles
    const { data: comments, error: commError } = await supabase
      .from('comments')
      .select(`
        *,
        user:profiles!user_id(full_name, role)
      `)
      .eq('complaint_id', id)
      .order('created_at', { ascending: true });

    // 3. Fetch upvotes
    const { data: upvotes } = await supabase
      .from('upvotes')
      .select('user_id')
      .eq('complaint_id', id);

    return NextResponse.json({
      complaint: {
        ...complaint,
        citizenName: complaint.citizen?.full_name || 'Anonymous Citizen',
        citizenPhone: complaint.citizen?.phone || 'Unknown',
      },
      comments: comments || [],
      upvotes: upvotes?.map((u: any) => u.user_id) || [],
    });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

export async function PATCH(
  request: Request,
  { params }: { params: ParamsInput }
) {
  try {
    const resolvedParams = await params;
    const { id } = resolvedParams;
    const supabase = createServerSupabase();
    const body = await request.json();

    const { action, userId, content, status, priority, department, assigned_to } = body;

    if (!action) {
      return NextResponse.json({ error: 'Action is required in request body.' }, { status: 400 });
    }

    // A. UPVOTE TOGGLE ACTION
    if (action === 'upvote') {
      if (!userId) {
        return NextResponse.json({ error: 'User ID is required for upvoting.' }, { status: 400 });
      }

      // Check if already upvoted
      const { data: existing } = await supabase
        .from('upvotes')
        .select('id')
        .eq('complaint_id', id)
        .eq('user_id', userId)
        .maybeSingle();

      if (existing) {
        // Remove upvote (unlike)
        const { error } = await supabase
          .from('upvotes')
          .delete()
          .eq('id', existing.id);
        if (error) return NextResponse.json({ error: error.message }, { status: 500 });
        return NextResponse.json({ success: true, upvoted: false });
      } else {
        // Add upvote
        const { error } = await supabase
          .from('upvotes')
          .insert({ complaint_id: id, user_id: userId });
        if (error) return NextResponse.json({ error: error.message }, { status: 500 });
        return NextResponse.json({ success: true, upvoted: true });
      }
    }

    // B. COMMENT SUBMISSION ACTION
    if (action === 'comment') {
      if (!userId || !content) {
        return NextResponse.json({ error: 'User ID and comment content are required.' }, { status: 400 });
      }

      const { data: comment, error } = await supabase
        .from('comments')
        .insert({
          complaint_id: id,
          user_id: userId,
          content,
        })
        .select(`
          *,
          user:profiles!user_id(full_name, role)
        `)
        .single();

      if (error) return NextResponse.json({ error: error.message }, { status: 500 });
      return NextResponse.json({ success: true, comment });
    }

    // C. ADMIN UPDATE ACTION (status, priority, department, assigned_to)
    if (action === 'update_status') {
      if (!status) {
        return NextResponse.json({ error: 'Status is required to update.' }, { status: 400 });
      }

      // Get current complaint to fetch citizen_id for notification
      const { data: current } = await supabase
        .from('complaints')
        .select('citizen_id, title')
        .eq('id', id)
        .single();

      // Perform update
      const { data: updated, error } = await supabase
        .from('complaints')
        .update({
          status,
          priority: priority || undefined,
          department: department || undefined,
          assigned_to: assigned_to || undefined,
        })
        .eq('id', id)
        .select()
        .single();

      if (error) return NextResponse.json({ error: error.message }, { status: 500 });

      // Create notification for citizen
      if (current?.citizen_id) {
        let notificationMsg = `Your complaint "${current.title}" status has been updated to "${status}".`;
        if (department) {
          notificationMsg += ` It has been assigned to the "${department}" department.`;
        }
        await supabase.from('notifications').insert({
          user_id: current.citizen_id,
          complaint_id: id,
          message: notificationMsg,
          type: 'in_app',
        });
      }

      return NextResponse.json({ success: true, complaint: updated });
    }

    return NextResponse.json({ error: 'Invalid action.' }, { status: 400 });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
