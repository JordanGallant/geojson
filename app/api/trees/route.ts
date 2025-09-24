import { NextRequest, NextResponse } from 'next/server';
import { Pool, PoolClient } from 'pg';

// Define types for better TypeScript support
interface TreeRow {
    id: string;
    Boomsoort: string;
    Boomhoogte: number;
    longitude: number;
    latitude: number;
    distance_meters: number;
}

interface Tree {
    id: string;
    boomsoort: string;
    boomhoogte: number;
    coordinates: [number, number];
    distance: number;
}

interface ApiResponse {
    success: boolean;
    userLocation: { lat: number; lng: number };
    trees: Tree[];
    closest: Tree;
}

interface ErrorResponse {
    error: string;
    message?: string;
}

// Database connection
const pool = new Pool({
    user: 'trees_user',
    host: '68.219.251.95',
    database: 'treesdb',
    password: 'Animal_Farmz2022!!',
    port: 5432,
});

// Test database connection on startup
pool.connect((err: Error | undefined, client: PoolClient | undefined, release: () => void) => {
    if (err) {
        console.error('Error connecting to database:', err.stack);
    } else {
        console.log('Connected to PostgreSQL database');
        release();
    }
});

export async function GET(request: NextRequest): Promise<NextResponse<ApiResponse | ErrorResponse | { message: string }>> {
    try {
        const { searchParams } = new URL(request.url);
        const lat: string | null = searchParams.get('lat');
        const lng: string | null = searchParams.get('lng');
        const limit: string = searchParams.get('limit') || '1';
        
        if (!lat || !lng) {
            return NextResponse.json(
                { error: 'Latitude and longitude are required' },
                { status: 400 }
            );
        }
        
        const userLat = parseFloat(lat);
        const userLng = parseFloat(lng);
        
        if (isNaN(userLat) || isNaN(userLng)) {
            return NextResponse.json(
                { error: 'Invalid latitude or longitude' },
                { status: 400 }
            );
        }
        
        // SQL query to find closest trees using spatial distance
        const query = `
            SELECT 
                "ID" AS id,
                "Boomsoort",
                "Boomhoogte",
                ST_X("geometry") AS longitude,
                ST_Y("geometry") AS latitude,
                ST_Distance(
                    "geometry"::geography,
                    ST_SetSRID(ST_Point($2, $1), 4326)::geography
                ) AS distance_meters
            FROM trees_centroids
            WHERE "geometry" IS NOT NULL
            ORDER BY "geometry" <-> ST_SetSRID(ST_Point($2, $1), 4326)
            LIMIT $3;
        `;
        
        const result = await pool.query(query, [userLat, userLng, parseInt(limit)]);
        
        if (result.rows.length === 0) {
            return NextResponse.json({ message: 'No trees found' });
        }
        
        const trees: Tree[] = result.rows.map((row: TreeRow) => ({
            id: row.id,
            boomsoort: row.Boomsoort,
            boomhoogte: row.Boomhoogte,
            coordinates: [row.longitude, row.latitude],
            distance: Math.round(row.distance_meters)
        }));
        
        return NextResponse.json({
            success: true,
            userLocation: { lat: userLat, lng: userLng },
            trees: trees,
            closest: trees[0]
        });
        
    } catch (error: unknown) {
        console.error('Database error:', error);
        return NextResponse.json(
            { error: 'Internal server error' },
            { status: 500 }
        );
    }
}

// Optional: Add POST method if needed
export async function POST(request: NextRequest): Promise<NextResponse<ErrorResponse>> {
    // Handle POST requests if needed
    return NextResponse.json(
        { error: 'Method not implemented' },
        { status: 501 }
    );
}