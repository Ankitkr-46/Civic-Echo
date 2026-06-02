import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '';

// --- MOCK DATABASE AND QUERY BUILDER ---

const DEFAULT_MOCK_DB = {
  profiles: [
    { id: 'admin-id', phone: '+11111111111', full_name: 'System Admin', role: 'admin' },
    { id: 'citizen-id', phone: '+12222222222', full_name: 'Jane Doe', role: 'citizen' }
  ],
  complaints: [
    {
      id: 'comp-1',
      citizen_id: 'citizen-id',
      title: 'Water Main Rupture on Metro Avenue',
      description: 'A major water pipeline has burst near the metro station exit. Hundreds of gallons of clean drinking water are leaking onto the road, causing massive traffic congestion and flooding of nearby footpaths. Needs urgent municipal response.',
      summary: 'Urgent water pipeline rupture flooding Metro Avenue near the station exit.',
      category: 'Water Supply',
      status: 'In Progress',
      priority: 'High',
      location_lat: 28.6145,
      location_lng: 77.2085,
      location_address: 'Metro Station Exit 2, Metro Avenue, New Delhi, Delhi 110001',
      media_urls: [],
      created_at: new Date(Date.now() - 3600000 * 4).toISOString(),
      department: 'Water & Sewage Authority',
      assigned_to: 'Inspector Ramesh Kumar'
    },
    {
      id: 'comp-2',
      citizen_id: 'citizen-id',
      title: 'Hazardous Open Pothole at Central Intersection',
      description: 'There is an extremely deep and wide pothole right in the middle of the central intersection. It is highly hazardous for two-wheelers, especially during night hours. Several cars have already suffered tyre damage.',
      summary: 'Deep, hazardous pothole in the center of the main intersection.',
      category: 'Road Issues',
      status: 'Under Review',
      priority: 'High',
      location_lat: 28.6120,
      location_lng: 77.2110,
      location_address: 'Central Intersection, Connaught Place, New Delhi, Delhi 110001',
      media_urls: [],
      created_at: new Date(Date.now() - 3600000 * 24).toISOString(),
      department: 'Public Works Department (PWD)',
      assigned_to: null
    },
    {
      id: 'comp-3',
      citizen_id: 'admin-id',
      title: 'Commercial Waste Dumping in Residential Green Zone',
      description: 'Local commercial trucks are illegal dumping plastic crates, toxic packing material, and organic waste into the designated park green belt. The smell is unbearable and it is attracting stray animals.',
      summary: 'Illegal commercial waste dumping in the residential park green belt.',
      category: 'Garbage & Sanitation',
      status: 'Resolved',
      priority: 'Medium',
      location_lat: 28.6180,
      location_lng: 77.2050,
      location_address: 'Green Belt Park, Sector 4, New Delhi, Delhi 110001',
      media_urls: [],
      created_at: new Date(Date.now() - 3600000 * 72).toISOString(),
      department: 'Municipal Corporation Sanitation Division',
      assigned_to: 'Officer Amit Sharma'
    }
  ],
  comments: [
    {
      id: 'comm-1',
      complaint_id: 'comp-1',
      user_id: 'admin-id',
      content: 'Field response unit has been dispatched with welding and excavation gear. Water supply to the localized main valve has been temporarily shut off to contain the flooding.',
      created_at: new Date(Date.now() - 3600000 * 3).toISOString()
    },
    {
      id: 'comm-2',
      complaint_id: 'comp-1',
      user_id: 'citizen-id',
      content: 'Thank you for the quick action! The water level on the street is already starting to recede.',
      created_at: new Date(Date.now() - 3600000 * 2).toISOString()
    }
  ],
  upvotes: [
    { id: 'up-1', complaint_id: 'comp-1', user_id: 'admin-id' },
    { id: 'up-2', complaint_id: 'comp-2', user_id: 'citizen-id' }
  ],
  notifications: [
    {
      id: 'not-1',
      user_id: 'citizen-id',
      complaint_id: 'comp-1',
      message: 'Your complaint "Water Main Rupture on Metro Avenue" status has been updated to "In Progress". It has been assigned to the "Water & Sewage Authority" department.',
      is_read: false,
      created_at: new Date(Date.now() - 3600000 * 3).toISOString()
    }
  ]
};

const getMockDb = () => {
  if (typeof window === 'undefined') {
    const globalVar = global as any;
    if (!globalVar.__civicMockDb) {
      globalVar.__civicMockDb = JSON.parse(JSON.stringify(DEFAULT_MOCK_DB));
    }
    return globalVar.__civicMockDb;
  }
  
  const windowVar = window as any;
  if (!windowVar.__civicMockDb) {
    const stored = localStorage.getItem('civic_mock_db');
    if (stored) {
      try {
        windowVar.__civicMockDb = JSON.parse(stored);
      } catch (e) {
        // Fallback
      }
    }
    if (!windowVar.__civicMockDb) {
      windowVar.__civicMockDb = JSON.parse(JSON.stringify(DEFAULT_MOCK_DB));
      localStorage.setItem('civic_mock_db', JSON.stringify(windowVar.__civicMockDb));
    }
  }
  return windowVar.__civicMockDb;
};

const saveMockDb = (db: any) => {
  if (typeof window !== 'undefined') {
    const windowVar = window as any;
    windowVar.__civicMockDb = db;
    localStorage.setItem('civic_mock_db', JSON.stringify(db));
  } else {
    const globalVar = global as any;
    globalVar.__civicMockDb = db;
  }
};

class MockQueryBuilder {
  private table: string;
  private filters: { field: string; value: any }[] = [];
  private orderField: string | null = null;
  private orderAsc: boolean = true;
  private limitCount: number | null = null;

  constructor(table: string) {
    this.table = table;
  }

  select(columns: string = '*') {
    return this;
  }

  eq(field: string, value: any) {
    this.filters.push({ field, value });
    return this;
  }

  order(field: string, { ascending = true } = {}) {
    this.orderField = field;
    this.orderAsc = ascending;
    return this;
  }

  limit(count: number) {
    this.limitCount = count;
    return this;
  }

  then(onFulfilled?: any, onRejected?: any) {
    const db = getMockDb();
    let data = db[this.table] || [];

    // Apply filters
    for (const filter of this.filters) {
      data = data.filter((item: any) => item[filter.field] == filter.value);
    }

    // Force +11111111111 to always be admin
    if (this.table === 'profiles') {
      const phoneFilter = this.filters.find(f => f.field === 'phone');
      if (phoneFilter && phoneFilter.value && phoneFilter.value.toString().replace(/\D/g, '') === '11111111111') {
        data = [{ id: 'admin-id', phone: '+11111111111', full_name: 'System Admin', role: 'admin' }];
      }
    }

    // Apply relations for complaints, comments, upvotes
    if (this.table === 'complaints') {
      const profiles = db.profiles || [];
      const comments = db.comments || [];
      const upvotes = db.upvotes || [];
      data = data.map((c: any) => {
        const citizen = profiles.find((p: any) => p.id === c.citizen_id) || null;
        const compComments = comments.filter((comm: any) => comm.complaint_id === c.id);
        const compUpvotes = upvotes.filter((up: any) => up.complaint_id === c.id);
        return {
          ...c,
          citizen: citizen ? { full_name: citizen.full_name, phone: citizen.phone } : null,
          comments: compComments.map((comm: any) => ({ id: comm.id })),
          upvotes: compUpvotes.map((up: any) => ({ id: up.id }))
        };
      });
    } else if (this.table === 'comments') {
      const profiles = db.profiles || [];
      data = data.map((c: any) => {
        const user = profiles.find((p: any) => p.id === c.user_id) || null;
        return {
          ...c,
          user: user ? { full_name: user.full_name, role: user.role } : null
        };
      });
    }

    // Apply ordering
    if (this.orderField) {
      data = [...data].sort((a: any, b: any) => {
        const valA = a[this.orderField!];
        const valB = b[this.orderField!];
        if (valA < valB) return this.orderAsc ? -1 : 1;
        if (valA > valB) return this.orderAsc ? 1 : -1;
        return 0;
      });
    }

    // Apply limit
    if (this.limitCount !== null) {
      data = data.slice(0, this.limitCount);
    }

    return Promise.resolve({ data, error: null }).then(onFulfilled, onRejected);
  }

  async single() {
    const { data } = await this.then();
    const item = Array.isArray(data) ? data[0] : data;
    if (!item) {
      return { data: null, error: { message: 'Row not found' } };
    }
    return { data: item, error: null };
  }

  async maybeSingle() {
    const { data } = await this.then();
    const item = Array.isArray(data) ? data[0] : data;
    return { data: item || null, error: null };
  }

  insert(values: any) {
    const db = getMockDb();
    if (!db[this.table]) db[this.table] = [];

    const itemsToInsert = Array.isArray(values) ? values : [values];
    const insertedItems = itemsToInsert.map((item: any) => {
      const newItem = {
        id: item.id || 'id-' + Math.random().toString(36).substring(2, 11),
        created_at: new Date().toISOString(),
        ...item
      };
      db[this.table].push(newItem);
      return newItem;
    });

    saveMockDb(db);

    const mappedItems = insertedItems.map((c: any) => {
      if (this.table === 'comments') {
        const user = db.profiles.find((p: any) => p.id === c.user_id) || null;
        return {
          ...c,
          user: user ? { full_name: user.full_name, role: user.role } : null
        };
      }
      return c;
    });

    const insertResult = Array.isArray(values) ? mappedItems : mappedItems[0];
    
    return {
      select: () => ({
        single: () => Promise.resolve({ data: insertResult, error: null }),
        maybeSingle: () => Promise.resolve({ data: insertResult, error: null }),
        then: (onF?: any, onR?: any) => Promise.resolve({ data: mappedItems, error: null }).then(onF, onR)
      }),
      then: (onF?: any, onR?: any) => Promise.resolve({ data: mappedItems, error: null }).then(onF, onR)
    };
  }

  update(values: any) {
    return {
      eq: (field: string, value: any) => {
        const db = getMockDb();
        const data = db[this.table] || [];
        const updatedItems: any[] = [];
        
        db[this.table] = data.map((item: any) => {
          if (item[field] == value) {
            const updated = { ...item, ...values };
            updatedItems.push(updated);
            return updated;
          }
          return item;
        });
        
        saveMockDb(db);
        
        const updateResult = updatedItems[0] || null;
        return {
          select: () => ({
            single: () => Promise.resolve({ data: updateResult, error: null }),
            maybeSingle: () => Promise.resolve({ data: updateResult, error: null }),
            then: (onF?: any, onR?: any) => Promise.resolve({ data: updatedItems, error: null }).then(onF, onR)
          }),
          then: (onF?: any, onR?: any) => Promise.resolve({ data: updatedItems, error: null }).then(onF, onR)
        };
      }
    };
  }

  delete() {
    return {
      eq: (field: string, value: any) => {
        const db = getMockDb();
        const data = db[this.table] || [];
        db[this.table] = data.filter((item: any) => item[field] != value);
        saveMockDb(db);
        return Promise.resolve({ data: null, error: null });
      }
    };
  }
}

// Helper to detect if a key is a placeholder or invalid (real Supabase keys are long JWTs with '.' separators)
const isKeyInvalid = (key: string) => {
  return !key || !key.includes('.') || key.startsWith('sb_') || key.length < 50;
};

// Lazy initialization helper
let supabaseInstance: any = null;

export const getSupabaseClient = () => {
  if (!supabaseInstance) {
    if (!supabaseUrl || isKeyInvalid(supabaseAnonKey)) {
      console.warn('Warning: Supabase credentials are placeholders or not configured. Returning robust in-memory mock client.');
      return {
        from: (table: string) => new MockQueryBuilder(table)
      } as any;
    }
    supabaseInstance = createClient(supabaseUrl, supabaseAnonKey);
  }
  return supabaseInstance;
};

// Export browser client as a Proxy for lazy runtime evaluation, bypassing compile-time crashes
export const supabase = new Proxy({} as any, {
  get(target, prop) {
    const client = getSupabaseClient();
    return Reflect.get(client, prop);
  }
});

// Server Client (using Service Role for administrative operations)
export const createServerSupabase = () => {
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY || supabaseAnonKey;
  
  if (!supabaseUrl || isKeyInvalid(serviceRoleKey)) {
    console.warn('Warning: Supabase credentials are missing or placeholders on server. Returning robust in-memory mock client.');
    return {
      from: (table: string) => new MockQueryBuilder(table)
    } as any;
  }

  return createClient(supabaseUrl, serviceRoleKey, {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
    },
  });
};
