import { NextResponse } from 'next/server';
import { createServerSupabase } from '@/lib/supabase';
import { processComplaintAI } from '@/lib/gemini';

export async function GET(request: Request) {
  try {
    const supabase = createServerSupabase();
    
    // Fetch complaints with count of comments and upvotes
    const { data: complaints, error } = await supabase
      .from('complaints')
      .select(`
        *,
        citizen:profiles!citizen_id(full_name, phone),
        comments(id),
        upvotes(id)
      `)
      .order('created_at', { ascending: false });

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    // Format output to include computed upvotes & comments length
    const formatted = complaints.map((comp: any) => ({
      ...comp,
      upvotesCount: comp.upvotes?.length || 0,
      commentsCount: comp.comments?.length || 0,
      citizenName: comp.citizen?.full_name || 'Anonymous Citizen',
      citizenPhone: comp.citizen?.phone || 'Unknown',
    }));

    return NextResponse.json({ complaints: formatted });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const supabase = createServerSupabase();
    const body = await request.json();

    const {
      citizen_id,
      title,
      description,
      location_lat,
      location_lng,
      location_address,
      voice_url,
      media_urls,
    } = body;

    if (!title || !description) {
      return NextResponse.json({ error: 'Title and description are required.' }, { status: 400 });
    }

    // 1. Fetch recent complaints of last 30 days to perform duplicate check
    const { data: existingComplaints } = await supabase
      .from('complaints')
      .select('id, category, location_lat, location_lng, status')
      .limit(100);

    // 2. Process AI pipeline
    const aiResult = await processComplaintAI(
      title,
      description,
      location_lat || null,
      location_lng || null,
      existingComplaints || []
    );

    // 3. Insert complaint
    const { data: complaint, error: insertError } = await supabase
      .from('complaints')
      .insert({
        citizen_id: citizen_id || null,
        title: aiResult.detectedLanguage !== 'English' && aiResult.translatedTitle ? aiResult.translatedTitle : title,
        description: aiResult.detectedLanguage !== 'English' && aiResult.translatedDescription ? aiResult.translatedDescription : description,
        summary: aiResult.summary,
        category: aiResult.category,
        priority: aiResult.priority,
        status: 'Submitted',
        location_lat,
        location_lng,
        location_address,
        voice_url: voice_url || null,
        media_urls: media_urls || [],
      })
      .select()
      .single();

    if (insertError) {
      return NextResponse.json({ error: insertError.message }, { status: 500 });
    }

    // 4. Create initial notification if citizen_id is provided
    if (citizen_id) {
      await supabase.from('notifications').insert({
        user_id: citizen_id,
        complaint_id: complaint.id,
        message: `Your complaint "${complaint.title}" was successfully submitted. AI categorized it under "${complaint.category}" with ${complaint.priority} priority.`,
        type: 'in_app',
      });
    }

    return NextResponse.json({
      success: true,
      complaint,
      ai: {
        detectedLanguage: aiResult.detectedLanguage,
        confidence: aiResult.confidence,
        duplicateDetected: aiResult.duplicateDetected,
        duplicateComplaintId: aiResult.duplicateComplaintId,
      },
    });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
