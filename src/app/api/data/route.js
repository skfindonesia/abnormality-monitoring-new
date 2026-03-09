import { NextResponse } from "next/server";
import { getPool } from "@/lib/db";

export async function GET() {
  const pool = getPool();
  let client;

  try {
    // Test koneksi database
    client = await pool.connect();
    console.log("Database connected successfully");

    // Query SEMUA data dari tabel UNZYP_QrySRPart dengan Qty, diurutkan berdasarkan IPD dan Tanggal
    const result = await client.query(`
      SELECT 
        "TglApprovalGudang",
        "NoSR",
        "KodePart",
        "Tipe",
        "PakaiTiapBulan",
        "LamaPakai",
        "KodeSatuan",
        "Qty",
        "NamaItem",
        "Spesifikasi"
      FROM "UNZYP_QrySRPart"
      ORDER BY "KodePart" ASC, "TglApprovalGudang" ASC
    `);

    console.log(`Fetched ${result.rows.length} rows from database`);

    // Jika tidak ada data, return array kosong
    if (!result.rows || result.rows.length === 0) {
      console.log("No data found in database");
      return NextResponse.json([]);
    }

    // Group data by IPD dan Year untuk kalkulasi Cons YTD secara akumulatif
    const ipdYearAccumulation = {};
    const ipdYearFirstEntry = {};
    const ipdDataMap = {}; // Menyimpan semua data per IPD

    // Map data sesuai dengan kolom yang diminta dan kalkulasi
    result.rows.forEach((row) => {
      const ipd = row.KodePart;
      const date = new Date(row.TglApprovalGudang);
      const year = date.getFullYear();
      const todaySR = parseFloat(row.Qty) || 0;
      const consMonth = parseFloat(row.PakaiTiapBulan) || 0;

      // Inisialisasi untuk IPD dan tahun jika belum ada
      const key = `${ipd}_${year}`;
      if (!ipdYearAccumulation[key]) {
        ipdYearAccumulation[key] = 0;
        ipdYearFirstEntry[key] = true;
      }

      // Cons YTD: kosong untuk entry pertama, akumulasi untuk entry berikutnya
      let consYTD = 0;
      if (ipdYearFirstEntry[key]) {
        consYTD = 0;
        ipdYearFirstEntry[key] = false;
      } else {
        consYTD = ipdYearAccumulation[key];
      }

      // Tambahkan Today SR ke akumulasi untuk entry berikutnya
      ipdYearAccumulation[key] += todaySR;

      // Total Cons After SR: Today SR + Cons YTD
      const totalConsAfterSR = todaySR + consYTD;

      // Total Cons Per Month After SR: Total Cons After SR / 12
      const totalConsPerMonthAfterSR = totalConsAfterSR / 12;

      // Tentukan status berdasarkan perbandingan
      let status = "Normal";
      if (consMonth > 0) {
        // Gunakan toleransi untuk perbandingan floating point
        const tolerance = 0.01; // Toleransi 0.01 untuk menangani pembulatan 2 desimal
        const diff = totalConsPerMonthAfterSR - consMonth;

        if (Math.abs(diff) <= tolerance) {
          // Jika perbedaannya sangat kecil atau sama, dianggap sama
          status = "Abnormality Warning";
        } else if (diff > tolerance) {
          // Jika totalConsPerMonthAfterSR lebih besar dari consMonth
          status = "Abnormality";
        } else {
          // Jika totalConsPerMonthAfterSR lebih kecil dari consMonth
          status = "Normal";
        }
      }

      const dataEntry = {
        tglApprovalGudang: row.TglApprovalGudang || null,
        noSR: row.NoSR || null,
        ipd: ipd || null,
        deskripsi: row.Tipe || null,
        namaItem: row.NamaItem || null,
        spesifikasi: row.Spesifikasi || null,
        consumptionMonth: consMonth,
        leadTime: row.LamaPakai || null,
        consumptionYTD: consYTD === 0 ? null : consYTD.toFixed(2),
        todaySR: todaySR.toFixed(2),
        totalConsumptionAfterSR: totalConsAfterSR.toFixed(2),
        totalConsumptionPerMonthAfterSR: totalConsPerMonthAfterSR.toFixed(2),
        kodeSatuan: row.KodeSatuan || null,
        status: status,
      };

      // Simpan data per IPD
      if (!ipdDataMap[ipd]) {
        ipdDataMap[ipd] = [];
      }
      ipdDataMap[ipd].push(dataEntry);
    });

    // Ambil hanya 2 data terbaru per IPD (1 untuk table, 1 untuk previous)
    const finalData = [];
    Object.keys(ipdDataMap).forEach((ipd) => {
      const ipdData = ipdDataMap[ipd];
      // Ambil 2 data terbaru (reverse untuk mendapatkan yang terbaru)
      const latestTwo = ipdData.slice(-2);

      if (latestTwo.length > 0) {
        const currentData = latestTwo[latestTwo.length - 1]; // Data terbaru
        const previousData =
          latestTwo.length > 1 ? latestTwo[latestTwo.length - 2] : null; // Data sebelumnya

        // Tambahkan previousData ke currentData
        currentData.previousData = previousData;
        finalData.push(currentData);
      }
    });

    return NextResponse.json(finalData, {
      headers: {
        "Content-Type": "application/json",
      },
    });
  } catch (error) {
    console.error("Detailed Error:", {
      message: error.message,
      code: error.code,
      detail: error.detail,
      hint: error.hint,
      stack: error.stack,
    });

    return NextResponse.json(
      {
        error: "Failed to fetch data from database",
        details: error.message,
        code: error.code,
      },
      {
        status: 500,
        headers: {
          "Content-Type": "application/json",
        },
      },
    );
  } finally {
    if (client) {
      client.release();
      console.log("Database connection released");
    }
  }
}
