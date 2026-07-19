import { pool } from '../lib/db.js';

export interface Property {
  key?: string; // stored as bigint in DB, serialized as string in API
  user_id: string;
  title: string;
  description?: string;
  transaction_type: 'Sell' | 'Rent';
  expected_price?: number;
  negotiable?: boolean;
  monthly_rent?: number;
  security_deposit?: number;
  available_from?: string;
  category: 'Residential' | 'Commercial' | 'Land';
  type: string;
  city: string;
  locality: string;
  full_address: string;
  image?: string;
  images?: string[];
  built_up_area?: number;
  plot_area?: number;
  furnishing?: string;
  parking?: string;
  status: 'Available' | 'Sold' | 'Rented' | 'Hidden';
  beds?: number;
  baths?: number;
  property_age?: string;
  ready_to_move?: boolean;
  floor_number?: string;
  total_floors?: string;
  garden?: boolean;
  washrooms?: number;
  plot_width?: number;
  plot_length?: number;
  corner_plot?: boolean;
  amenities?: string[];
  other_amenities?: string[];
  created_at?: string;
  updated_at?: string;
}

export async function getPropertiesByUser(userId: string): Promise<Property[]> {
  const result = await pool.query(
    'SELECT * FROM properties WHERE user_id = $1 ORDER BY created_at DESC',
    [userId]
  );
  return result.rows.map(row => mapRowToProperty(row));
}

export async function getPropertyByKey(key: string | number): Promise<Property | null> {
  const result = await pool.query('SELECT * FROM properties WHERE key = $1', [key]);
  if (result.rows.length === 0) return null;
  return mapRowToProperty(result.rows[0]);
}

export async function createProperty(
  prop: Omit<Property, 'key' | 'user_id' | 'created_at' | 'updated_at'>,
  userId: string
): Promise<Property> {
  const query = `
    INSERT INTO properties (
      user_id, title, description, transaction_type, expected_price, negotiable,
      monthly_rent, security_deposit, available_from, category, type, city, locality,
      full_address, image, images, built_up_area, plot_area, furnishing, parking,
      status, beds, baths, property_age, ready_to_move, floor_number, total_floors,
      garden, washrooms, plot_width, plot_length, corner_plot, amenities, other_amenities
    ) VALUES (
      $1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18,
      $19, $20, $21, $22, $23, $24, $25, $26, $27, $28, $29, $30, $31, $32, $33, $34
    ) RETURNING *
  `;
  const values = [
    userId,
    prop.title,
    prop.description || null,
    prop.transaction_type,
    prop.expected_price || null,
    prop.negotiable || false,
    prop.monthly_rent || null,
    prop.security_deposit || null,
    prop.available_from || null,
    prop.category,
    prop.type,
    prop.city,
    prop.locality,
    prop.full_address,
    prop.image || null,
    JSON.stringify(prop.images || []),
    prop.built_up_area || null,
    prop.plot_area || null,
    prop.furnishing || null,
    prop.parking || null,
    prop.status || 'Available',
    prop.beds || null,
    prop.baths || null,
    prop.property_age || null,
    prop.ready_to_move !== undefined ? prop.ready_to_move : true,
    prop.floor_number || null,
    prop.total_floors || null,
    prop.garden || false,
    prop.washrooms || null,
    prop.plot_width || null,
    prop.plot_length || null,
    prop.corner_plot || false,
    JSON.stringify(prop.amenities || []),
    JSON.stringify(prop.other_amenities || [])
  ];

  const result = await pool.query(query, values);
  return mapRowToProperty(result.rows[0]);
}

export async function updateProperty(
  key: string | number,
  prop: Partial<Property>,
  userId: string
): Promise<Property | null> {
  const current = await getPropertyByKey(key);
  if (!current || current.user_id !== userId) return null;

  const query = `
    UPDATE properties SET
      title = COALESCE($1, title),
      description = COALESCE($2, description),
      transaction_type = COALESCE($3, transaction_type),
      expected_price = COALESCE($4, expected_price),
      negotiable = COALESCE($5, negotiable),
      monthly_rent = COALESCE($6, monthly_rent),
      security_deposit = COALESCE($7, security_deposit),
      available_from = COALESCE($8, available_from),
      category = COALESCE($9, category),
      type = COALESCE($10, type),
      city = COALESCE($11, city),
      locality = COALESCE($12, locality),
      full_address = COALESCE($13, full_address),
      image = COALESCE($14, image),
      images = COALESCE($15, images),
      built_up_area = COALESCE($16, built_up_area),
      plot_area = COALESCE($17, plot_area),
      furnishing = COALESCE($18, furnishing),
      parking = COALESCE($19, parking),
      status = COALESCE($20, status),
      beds = COALESCE($21, beds),
      baths = COALESCE($22, baths),
      property_age = COALESCE($23, property_age),
      ready_to_move = COALESCE($24, ready_to_move),
      floor_number = COALESCE($25, floor_number),
      total_floors = COALESCE($26, total_floors),
      garden = COALESCE($27, garden),
      washrooms = COALESCE($28, washrooms),
      plot_width = COALESCE($29, plot_width),
      plot_length = COALESCE($30, plot_length),
      corner_plot = COALESCE($31, corner_plot),
      amenities = COALESCE($32, amenities),
      other_amenities = COALESCE($33, other_amenities),
      updated_at = CURRENT_TIMESTAMP
    WHERE key = $34 AND user_id = $35
    RETURNING *
  `;

  const values = [
    prop.title !== undefined ? prop.title : null,
    prop.description !== undefined ? prop.description : null,
    prop.transaction_type !== undefined ? prop.transaction_type : null,
    prop.expected_price !== undefined ? prop.expected_price : null,
    prop.negotiable !== undefined ? prop.negotiable : null,
    prop.monthly_rent !== undefined ? prop.monthly_rent : null,
    prop.security_deposit !== undefined ? prop.security_deposit : null,
    prop.available_from !== undefined ? prop.available_from : null,
    prop.category !== undefined ? prop.category : null,
    prop.type !== undefined ? prop.type : null,
    prop.city !== undefined ? prop.city : null,
    prop.locality !== undefined ? prop.locality : null,
    prop.full_address !== undefined ? prop.full_address : null,
    prop.image !== undefined ? prop.image : null,
    prop.images !== undefined ? JSON.stringify(prop.images) : null,
    prop.built_up_area !== undefined ? prop.built_up_area : null,
    prop.plot_area !== undefined ? prop.plot_area : null,
    prop.furnishing !== undefined ? prop.furnishing : null,
    prop.parking !== undefined ? prop.parking : null,
    prop.status !== undefined ? prop.status : null,
    prop.beds !== undefined ? prop.beds : null,
    prop.baths !== undefined ? prop.baths : null,
    prop.property_age !== undefined ? prop.property_age : null,
    prop.ready_to_move !== undefined ? prop.ready_to_move : null,
    prop.floor_number !== undefined ? prop.floor_number : null,
    prop.total_floors !== undefined ? prop.total_floors : null,
    prop.garden !== undefined ? prop.garden : null,
    prop.washrooms !== undefined ? prop.washrooms : null,
    prop.plot_width !== undefined ? prop.plot_width : null,
    prop.plot_length !== undefined ? prop.plot_length : null,
    prop.corner_plot !== undefined ? prop.corner_plot : null,
    prop.amenities !== undefined ? JSON.stringify(prop.amenities) : null,
    prop.other_amenities !== undefined ? JSON.stringify(prop.other_amenities) : null,
    key,
    userId
  ];

  const result = await pool.query(query, values);
  if (result.rows.length === 0) return null;
  return mapRowToProperty(result.rows[0]);
}

export async function deleteProperty(key: string | number, userId: string): Promise<boolean> {
  const result = await pool.query(
    'DELETE FROM properties WHERE key = $1 AND user_id = $2 RETURNING key',
    [key, userId]
  );
  return result.rows.length > 0;
}

// Helper to convert DB snake_case columns & stringified JSON array fields back to Property interface
// eslint-disable-next-line @typescript-eslint/no-explicit-any
function mapRowToProperty(row: any): Property {
  return {
    key: String(row.key),
    user_id: row.user_id,
    title: row.title,
    description: row.description || undefined,
    transaction_type: row.transaction_type,
    expected_price: row.expected_price ? Number(row.expected_price) : undefined,
    negotiable: !!row.negotiable,
    monthly_rent: row.monthly_rent ? Number(row.monthly_rent) : undefined,
    security_deposit: row.security_deposit ? Number(row.security_deposit) : undefined,
    available_from: row.available_from ? new Date(row.available_from).toISOString().split('T')[0] : undefined,
    category: row.category,
    type: row.type,
    city: row.city,
    locality: row.locality,
    full_address: row.full_address,
    image: row.image || undefined,
    images: Array.isArray(row.images) ? row.images : JSON.parse(row.images || '[]'),
    built_up_area: row.built_up_area ? Number(row.built_up_area) : undefined,
    plot_area: row.plot_area ? Number(row.plot_area) : undefined,
    furnishing: row.furnishing || undefined,
    parking: row.parking || undefined,
    status: row.status,
    beds: row.beds !== null ? Number(row.beds) : undefined,
    baths: row.baths !== null ? Number(row.baths) : undefined,
    property_age: row.property_age || undefined,
    ready_to_move: !!row.ready_to_move,
    floor_number: row.floor_number || undefined,
    total_floors: row.total_floors || undefined,
    garden: !!row.garden,
    washrooms: row.washrooms !== null ? Number(row.washrooms) : undefined,
    plot_width: row.plot_width ? Number(row.plot_width) : undefined,
    plot_length: row.plot_length ? Number(row.plot_length) : undefined,
    corner_plot: !!row.corner_plot,
    amenities: Array.isArray(row.amenities) ? row.amenities : JSON.parse(row.amenities || '[]'),
    other_amenities: Array.isArray(row.other_amenities) ? row.other_amenities : JSON.parse(row.other_amenities || '[]'),
    created_at: row.created_at,
    updated_at: row.updated_at
  };
}
