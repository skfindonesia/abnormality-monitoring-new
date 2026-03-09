import { NextResponse } from "next/server";
import { getPool } from "@/lib/db";

export async function GET() {
  const pool = getPool();
  let client;

  try {
    client = await pool.connect();
    console.log("Database connection test: SUCCESS");

    // Test query sederhana
    const result = await client.query("SELECT NOW() as current_time");

    // Cek apakah tabel ada
    const tableCheck = await client.query(`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'dbo' 
      AND table_name = 'UNZYP_QrySRPart'
    `);

    // Hitung jumlah rows
    let rowCount = 0;
    if (tableCheck.rows.length > 0) {
      const countResult = await client.query(`
        SELECT COUNT(*) as count 
        FROM "UNZYP_QrySRPart"
      `);
      rowCount = parseInt(countResult.rows[0].count);
    }

    return NextResponse.json({
      success: true,
      message: "Database connection successful",
      currentTime: result.rows[0].current_time,
      tableExists: tableCheck.rows.length > 0,
      tableName: "UNZYP_QrySRPart",
      rowCount: rowCount,
      config: {
        host: process.env.DB_HOST || "localhost",
        port: process.env.DB_PORT || "5432",
        database: process.env.DB_NAME || "abnormality_db",
        user: process.env.DB_USER || "postgres",
      },
    });
  } catch (error) {
    console.error("Database connection test: FAILED", error);

    return NextResponse.json(
      {
        success: false,
        error: error.message,
        code: error.code,
        detail: error.detail,
        hint: error.hint,
      },
      { status: 500 },
    );
  } finally {
    if (client) {
      client.release();
    }
  }
}
