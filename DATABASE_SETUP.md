# Database Setup Instructions

## Prerequisites
- PostgreSQL installed and running
- Database: `abnormality_db`
- Schema: `dbo`
- Table: `UNZYP_QrySRPart`

## Configuration

1. Copy `.env.local` file (already created) with the following content:
```
DB_HOST=localhost
DB_PORT=5432
DB_NAME=abnormality_db
DB_USER=postgres
DB_PASSWORD=postgres
DB_SCHEMA=dbo
```

2. Update the values if your PostgreSQL configuration is different.

## Testing Database Connection

1. Start the development server:
```bash
npm run dev
```

2. Test the database connection by visiting:
```
http://localhost:3000/api/test-db
```

This will show:
- Connection status
- Current database time
- Whether the table exists
- Row count in the table

3. Test the data API:
```
http://localhost:3000/api/data
```

## Troubleshooting

### Error: "relation does not exist"
- Check if the schema name is correct (dbo)
- Check if the table name is correct (UNZYP_QrySRPart)
- Verify column names match exactly (case-sensitive)

### Error: "password authentication failed"
- Verify PostgreSQL username and password
- Check pg_hba.conf for authentication method

### Error: "connection refused"
- Ensure PostgreSQL is running
- Check if port 5432 is correct
- Verify host is accessible

## Table Structure Expected

The application expects the following columns in `dbo.UNZYP_QrySRPart`:
- TglApprovalGudang (Date)
- NoSR (String)
- KodePart (String) - Used as IPD
- Tipe (String) - Used as Description
- PakaiTiapBulan (Number) - Consumption per Month
- LamaPakai (Number) - Consumption This Month
- KodeSatuan (String) - Unit Code
- Qty (Number) - Quantity used for calculations

## Data Calculations

The application performs the following calculations:

1. **Today SR**: Direct value from `Qty` column
2. **Cons YTD**: Cumulative consumption Year-To-Date for the same IPD within the same year
   - **First entry**: Cons YTD is empty (null)
   - **Second entry onwards**: Cons YTD = Sum of all previous Today SR values for that IPD in the same year
   - Example for IPD "001-ABC" in 2025:
     - Entry 1 (Jan): Today SR = 1, Cons YTD = (empty)
     - Entry 2 (Feb): Today SR = 1, Cons YTD = 1 (from previous entry)
     - Entry 3 (Mar): Today SR = 2, Cons YTD = 2 (1+1 from previous entries)
     - Entry 4 (Apr): Today SR = 3, Cons YTD = 4 (1+1+2 from previous entries)
3. **Total Cons After SR**: Today SR + Cons YTD
4. **Total Cons Per Month After SR**: Total Cons After SR / 12 months
5. **Status**: Automatically determined by comparing Total Cons Per Month After SR with Cons/Month
   - **Normal**: Total Cons Per Month After SR < Cons/Month
   - **Abnormality Warning**: Total Cons Per Month After SR = Cons/Month
   - **Abnormality**: Total Cons Per Month After SR > Cons/Month

### Example Calculation:
```
IPD: 001-ABC, Cons/Month: 5
Year: 2025

Entry 1 (2025-01-15):
- Today SR: 1
- Cons YTD: (empty)
- Total Cons After SR: 1 + 0 = 1
- Total Cons Per Month After SR: 1 / 12 = 0.08
- Status: Normal (0.08 < 5)

Entry 2 (2025-02-20):
- Today SR: 1
- Cons YTD: 1 (from Entry 1)
- Total Cons After SR: 1 + 1 = 2
- Total Cons Per Month After SR: 2 / 12 = 0.17
- Status: Normal (0.17 < 5)

Entry 3 (2025-03-10):
- Today SR: 2
- Cons YTD: 2 (1+1 from Entry 1 & 2)
- Total Cons After SR: 2 + 2 = 4
- Total Cons Per Month After SR: 4 / 12 = 0.33
- Status: Normal (0.33 < 5)
```
