"use client";

import { useState, useEffect, useMemo, useCallback } from "react";
import styles from "./DataTable.module.css";

export default function DataTable() {
  const [searchQuery, setSearchQuery] = useState("");
  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [pageLoading, setPageLoading] = useState(false);
  const [error, setError] = useState(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [selectedIPD, setSelectedIPD] = useState("ALL");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [availableDates, setAvailableDates] = useState([]);
  const [dateSortOrder, setDateSortOrder] = useState("desc"); // 'asc' or 'desc'
  const [selectedStatus, setSelectedStatus] = useState("ALL"); // Status filter

  // Temporary states untuk input sebelum di-apply
  const [tempSearchQuery, setTempSearchQuery] = useState("");
  const [tempSelectedIPD, setTempSelectedIPD] = useState("ALL");
  const [tempStartDate, setTempStartDate] = useState("");
  const [tempEndDate, setTempEndDate] = useState("");
  const [tempSelectedStatus, setTempSelectedStatus] = useState("ALL");

  // Modal state
  const [showModal, setShowModal] = useState(false);
  const [selectedRowData, setSelectedRowData] = useState(null);

  const rowsPerPage = 100;

  // IPD filter options
  const ipdFilters = [
    "ALL",
    "001",
    "002",
    "003",
    "004",
    "005",
    "006",
    "007",
    "008",
    "009",
    "010",
    "011",
  ];

  // Status filter options
  const statusFilters = ["ALL", "Normal", "Abnormality Warning", "Abnormality"];

  // Helper function untuk convert date menjadi format YYYY-MM-DD (local time)
  const getDateStringForComparison = useCallback((date) => {
    if (!date) return null;
    const d = new Date(date);
    if (isNaN(d.getTime())) return null;
    const year = d.getFullYear();
    const month = String(d.getMonth() + 1).padStart(2, "0");
    const day = String(d.getDate()).padStart(2, "0");
    return `${year}-${month}-${day}`;
  }, []);

  // Fetch data dari API
  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true);
        const response = await fetch("/api/data");

        if (!response.ok) {
          throw new Error(`HTTP error! status: ${response.status}`);
        }

        const text = await response.text();

        if (!text || text.trim() === "") {
          throw new Error("Empty response from server");
        }

        try {
          const result = JSON.parse(text);
          setData(result);

          // Extract unique dates untuk filter
          const dates = [
            ...new Set(
              result
                .map((row) => {
                  if (row.tglApprovalGudang) {
                    // Format tanggal jika perlu
                    const date = new Date(row.tglApprovalGudang);
                    if (!isNaN(date.getTime())) {
                      return date.toISOString().split("T")[0];
                    }
                    return row.tglApprovalGudang;
                  }
                  return null;
                })
                .filter((date) => date !== null),
            ),
          ]
            .sort()
            .reverse();

          setAvailableDates(dates);
          setError(null);
        } catch (parseError) {
          console.error("JSON Parse Error:", parseError);
          console.error("Response text:", text);
          throw new Error("Invalid JSON response from server");
        }
      } catch (err) {
        console.error("Error fetching data:", err);
        setError(err.message);
        setData([]);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, []);

  // Filter data berdasarkan search query, IPD filter, date filter, dan status filter - OPTIMIZED with useMemo
  const filteredData = useMemo(() => {
    return data.filter((row) => {
      const searchLower = searchQuery.toLowerCase();
      const matchesSearch =
        !searchQuery ||
        (row.tglApprovalGudang &&
          row.tglApprovalGudang
            .toString()
            .toLowerCase()
            .includes(searchLower)) ||
        (row.noSR && row.noSR.toString().toLowerCase().includes(searchLower)) ||
        (row.ipd && row.ipd.toString().toLowerCase().includes(searchLower)) ||
        (row.deskripsi && row.deskripsi.toLowerCase().includes(searchLower)) ||
        (row.namaItem &&
          row.namaItem.toString().toLowerCase().includes(searchLower)) ||
        (row.spesifikasi &&
          row.spesifikasi.toString().toLowerCase().includes(searchLower)) ||
        (row.kodeSatuan &&
          row.kodeSatuan.toString().toLowerCase().includes(searchLower));

      // Filter berdasarkan IPD
      const matchesIPD =
        selectedIPD === "ALL" ||
        (row.ipd && row.ipd.toString().startsWith(selectedIPD));

      // Filter berdasarkan Status
      const matchesStatus =
        selectedStatus === "ALL" ||
        (row.status && row.status === selectedStatus);

      // Filter berdasarkan tanggal
      let matchesDate = true;
      if (startDate || endDate) {
        if (row.tglApprovalGudang) {
          const rowDateStr = getDateStringForComparison(row.tglApprovalGudang);

          if (rowDateStr) {
            if (startDate && endDate) {
              matchesDate = rowDateStr >= startDate && rowDateStr <= endDate;
            } else if (startDate) {
              matchesDate = rowDateStr >= startDate;
            } else if (endDate) {
              matchesDate = rowDateStr <= endDate;
            }
          } else {
            matchesDate = false;
          }
        } else {
          matchesDate = false;
        }
      }

      return matchesSearch && matchesIPD && matchesDate && matchesStatus;
    });
  }, [
    data,
    searchQuery,
    selectedIPD,
    startDate,
    endDate,
    selectedStatus,
    getDateStringForComparison,
  ]);

  // Sort data berdasarkan tanggal - OPTIMIZED with useMemo
  const sortedData = useMemo(() => {
    return [...filteredData].sort((a, b) => {
      const dateA = new Date(a.tglApprovalGudang);
      const dateB = new Date(b.tglApprovalGudang);

      if (dateSortOrder === "asc") {
        return dateA - dateB;
      } else {
        return dateB - dateA;
      }
    });
  }, [filteredData, dateSortOrder]);

  // Pagination logic - OPTIMIZED with useMemo
  const paginationData = useMemo(() => {
    const totalPages = Math.ceil(sortedData.length / rowsPerPage);
    const startIndex = (currentPage - 1) * rowsPerPage;
    const endIndex = startIndex + rowsPerPage;
    const currentData = sortedData.slice(startIndex, endIndex);

    return { totalPages, startIndex, endIndex, currentData };
  }, [sortedData, currentPage, rowsPerPage]);

  const { totalPages, startIndex, endIndex, currentData } = paginationData;

  // Reset to page 1 when search query, IPD filter, date filter, or status filter changes
  useEffect(() => {
    setCurrentPage(1);
  }, [searchQuery, selectedIPD, startDate, endDate, selectedStatus]);

  const handlePageChange = useCallback((pageNumber) => {
    setPageLoading(true);
    setTimeout(() => {
      setCurrentPage(pageNumber);
      setPageLoading(false);
      const tableWrapper = document.querySelector(`.${styles.tableWrapper}`);
      if (tableWrapper) {
        tableWrapper.scrollTop = 0;
      }
    }, 100);
  }, []);

  const handlePrevPage = useCallback(() => {
    if (currentPage > 1) {
      handlePageChange(currentPage - 1);
    }
  }, [currentPage, handlePageChange]);

  const handleNextPage = useCallback(() => {
    if (currentPage < totalPages) {
      handlePageChange(currentPage + 1);
    }
  }, [currentPage, totalPages, handlePageChange]);

  const handleIPDFilter = useCallback((ipd) => {
    setTempSelectedIPD(ipd);
  }, []);

  const handleStatusFilter = useCallback((status) => {
    setTempSelectedStatus(status);
  }, []);

  const toggleDateSort = useCallback(() => {
    setDateSortOrder((prev) => (prev === "asc" ? "desc" : "asc"));
  }, []);

  const handleStartDateChange = useCallback((e) => {
    setTempStartDate(e.target.value);
  }, []);

  const handleEndDateChange = useCallback((e) => {
    setTempEndDate(e.target.value);
  }, []);

  const clearDateFilter = useCallback(() => {
    setTempStartDate("");
    setTempEndDate("");
    setStartDate("");
    setEndDate("");
  }, []);

  const handleSearchChange = useCallback((e) => {
    setTempSearchQuery(e.target.value);
  }, []);

  const handleSearchKeyPress = useCallback((e) => {
    if (e.key === "Enter") {
      applyFilters();
    }
  }, []);

  const applyFilters = useCallback(() => {
    setPageLoading(true);
    setTimeout(() => {
      setSearchQuery(tempSearchQuery);
      setSelectedIPD(tempSelectedIPD);
      setStartDate(tempStartDate);
      setEndDate(tempEndDate);
      setSelectedStatus(tempSelectedStatus);
      setCurrentPage(1);
      setPageLoading(false);
    }, 100);
  }, [
    tempSearchQuery,
    tempSelectedIPD,
    tempStartDate,
    tempEndDate,
    tempSelectedStatus,
  ]);

  const clearAllFilters = useCallback(() => {
    setPageLoading(true);
    setTimeout(() => {
      // Clear temporary states
      setTempSearchQuery("");
      setTempSelectedIPD("ALL");
      setTempStartDate("");
      setTempEndDate("");
      setTempSelectedStatus("ALL");

      // Clear applied states
      setSearchQuery("");
      setSelectedIPD("ALL");
      setStartDate("");
      setEndDate("");
      setSelectedStatus("ALL");
      setCurrentPage(1);
      setPageLoading(false);
    }, 100);
  }, []);

  const handleRowClick = useCallback((row) => {
    if (row.previousData) {
      setSelectedRowData(row);
      setShowModal(true);
    }
  }, []);

  const closeModal = useCallback(() => {
    setShowModal(false);
    setSelectedRowData(null);
  }, []);

  const formatDate = useCallback((dateString) => {
    if (!dateString) return "-";
    const date = new Date(dateString);
    if (isNaN(date.getTime())) return dateString;
    return date.toLocaleDateString("id-ID", {
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
    });
  }, []);

  const getPageNumbers = useCallback(() => {
    const pages = [];
    const maxPagesToShow = 5;

    if (totalPages <= maxPagesToShow) {
      for (let i = 1; i <= totalPages; i++) {
        pages.push(i);
      }
    } else {
      if (currentPage <= 3) {
        for (let i = 1; i <= 4; i++) {
          pages.push(i);
        }
        pages.push("...");
        pages.push(totalPages);
      } else if (currentPage >= totalPages - 2) {
        pages.push(1);
        pages.push("...");
        for (let i = totalPages - 3; i <= totalPages; i++) {
          pages.push(i);
        }
      } else {
        pages.push(1);
        pages.push("...");
        pages.push(currentPage - 1);
        pages.push(currentPage);
        pages.push(currentPage + 1);
        pages.push("...");
        pages.push(totalPages);
      }
    }

    return pages;
  }, [totalPages, currentPage]);

  const getStatusClass = useCallback((status) => {
    if (!status) return "";
    switch (status.toLowerCase()) {
      case "normal":
        return styles.statusNormal;
      case "abnormality warning":
        return styles.statusWarning;
      case "abnormality":
        return styles.statusAbnormality;
      default:
        return "";
    }
  }, []);

  const formatNumber = useCallback((value) => {
    if (!value || value === "-" || value === "null") return "-";
    const num = parseFloat(value);
    if (isNaN(num)) return "-";
    return num.toFixed(2);
  }, []);

  if (loading) {
    return (
      <div className={styles.tableContainer}>
        <div className={styles.loading}>Loading data from database...</div>
      </div>
    );
  }

  if (error) {
    return (
      <div className={styles.tableContainer}>
        <div className={styles.error}>Error: {error}</div>
      </div>
    );
  }

  return (
    <div className={styles.tableContainer}>
      <div className={styles.filterRow}>
        <div className={styles.searchContainer}>
          <input
            type="text"
            placeholder="Search by SR, IPD, Description, etc..."
            value={tempSearchQuery}
            onChange={handleSearchChange}
            onKeyPress={handleSearchKeyPress}
            className={styles.searchInput}
          />
        </div>

        <div className={styles.dateFilterContainer}>
          <div className={styles.dateFilterInputs}>
            <span className={styles.filterLabel}>Date Range:</span>
            <input
              type="date"
              value={tempStartDate}
              onChange={handleStartDateChange}
              className={styles.dateInput}
              placeholder="Start Date"
            />
            <span className={styles.filterLabel}>to</span>
            <input
              type="date"
              value={tempEndDate}
              onChange={handleEndDateChange}
              className={styles.dateInput}
              placeholder="End Date"
            />
          </div>
          {(tempStartDate || tempEndDate) && (
            <button
              onClick={clearDateFilter}
              className={styles.clearDateButton}
            >
              Clear
            </button>
          )}
        </div>

        <div className={styles.buttonFiltersRow}>
          <div className={styles.ipdFilterContainer}>
            <div className={styles.ipdButtons}>
              {ipdFilters.map((ipd) => (
                <button
                  key={ipd}
                  onClick={() => handleIPDFilter(ipd)}
                  className={`${styles.ipdButton} ${tempSelectedIPD === ipd ? styles.ipdButtonActive : ""}`}
                >
                  {ipd}
                </button>
              ))}
            </div>
          </div>

          <div className={styles.statusFilterContainer}>
            <div className={styles.statusButtons}>
              {statusFilters.map((status) => (
                <button
                  key={status}
                  onClick={() => handleStatusFilter(status)}
                  className={`${styles.statusButton} ${tempSelectedStatus === status ? styles.statusButtonActive : ""}`}
                >
                  {status}
                </button>
              ))}
            </div>
          </div>
        </div>

        <div className={styles.actionButtons}>
          <button onClick={applyFilters} className={styles.applyButton}>
            Apply
          </button>

          <button onClick={clearAllFilters} className={styles.clearAllButton}>
            Clear All
          </button>
        </div>
      </div>

      <div className={styles.paginationInfo}>
        Showing {startIndex + 1} to {Math.min(endIndex, sortedData.length)} of{" "}
        {sortedData.length} entries
        {selectedIPD !== "ALL" && (
          <span className={styles.filterActive}>
            {" "}
            (Filtered by IPD: {selectedIPD})
          </span>
        )}
        {(startDate || endDate) && (
          <span className={styles.filterActive}>
            {" "}
            (Filtered by Date: {startDate
              ? formatDate(startDate)
              : "any"} to {endDate ? formatDate(endDate) : "any"})
          </span>
        )}
        {selectedStatus !== "ALL" && (
          <span className={styles.filterActive}>
            {" "}
            (Filtered by Status: {selectedStatus})
          </span>
        )}
        <span className={styles.sortInfo}>
          {" "}
          | Sort: {dateSortOrder === "desc" ? "Newest First" : "Oldest First"}
        </span>
      </div>

      <div className={styles.tableWrapper}>
        {pageLoading && (
          <div className={styles.pageLoadingOverlay}>
            <div className={styles.pageLoadingSpinner}>Loading...</div>
          </div>
        )}
        <table className={styles.table}>
          <thead>
            <tr>
              <th onClick={toggleDateSort} className={styles.sortableHeader}>
                Tanggal {dateSortOrder === "desc" ? "↓" : "↑"}
              </th>
              <th>IPD</th>
              <th>Tipe</th>
              <th>Nama Item</th>
              <th>Spesifikasi</th>
              <th>Cons/Month</th>
              <th>Cons YTD</th>
              <th>Today SR</th>
              <th>Total Cons After SR</th>
              <th>Total Cons Per Month After SR</th>
              <th>KodeSatuan</th>
              <th>STATUS</th>
            </tr>
          </thead>
          <tbody>
            {currentData.length > 0 ? (
              currentData.map((row, index) => (
                <tr
                  key={startIndex + index}
                  onClick={() => handleRowClick(row)}
                  className={row.previousData ? styles.clickableRow : ""}
                  title={row.previousData ? "Click to view previous data" : ""}
                >
                  <td data-label="Tanggal">
                    {formatDate(row.tglApprovalGudang)}
                  </td>
                  <td data-label="IPD">{row.ipd || "-"}</td>
                  <td data-label="Tipe">{row.deskripsi || "-"}</td>
                  <td data-label="Nama Item">{row.namaItem || "-"}</td>
                  <td data-label="Spesifikasi">{row.spesifikasi || "-"}</td>
                  <td data-label="Cons/Month">{row.consumptionMonth || "-"}</td>
                  <td data-label="Cons YTD">
                    {formatNumber(row.consumptionYTD)}
                  </td>
                  <td data-label="Today SR">{formatNumber(row.todaySR)}</td>
                  <td data-label="Total Cons After SR">
                    {formatNumber(row.totalConsumptionAfterSR)}
                  </td>
                  <td data-label="Total Cons Per Month After SR">
                    {formatNumber(row.totalConsumptionPerMonthAfterSR)}
                  </td>
                  <td data-label="KodeSatuan">{row.kodeSatuan || "-"}</td>
                  <td data-label="STATUS">
                    {row.status ? (
                      <span
                        className={`${styles.statusBadge} ${getStatusClass(row.status)}`}
                      >
                        {row.status}
                      </span>
                    ) : (
                      "-"
                    )}
                  </td>
                </tr>
              ))
            ) : (
              <tr>
                <td colSpan="12" className={styles.noData}>
                  {data.length === 0
                    ? "No data available in database"
                    : `No data found matching your filters`}
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {sortedData.length > 0 && (
        <div className={styles.pagination}>
          <button
            onClick={handlePrevPage}
            disabled={currentPage === 1 || pageLoading}
            className={styles.paginationButton}
          >
            Previous
          </button>

          {getPageNumbers().map((page, index) =>
            page === "..." ? (
              <span
                key={`ellipsis-${index}`}
                className={styles.paginationEllipsis}
              >
                ...
              </span>
            ) : (
              <button
                key={page}
                onClick={() => handlePageChange(page)}
                disabled={pageLoading}
                className={`${styles.paginationButton} ${currentPage === page ? styles.active : ""}`}
              >
                {page}
              </button>
            ),
          )}

          <button
            onClick={handleNextPage}
            disabled={currentPage === totalPages || pageLoading}
            className={styles.paginationButton}
          >
            Next
          </button>
        </div>
      )}

      {/* Modal untuk menampilkan previous data */}
      {showModal && selectedRowData && selectedRowData.previousData && (
        <div className={styles.modalOverlay} onClick={closeModal}>
          <div
            className={styles.modalContent}
            onClick={(e) => e.stopPropagation()}
          >
            <div className={styles.modalHeader}>
              <h2>Previous Data - {selectedRowData.ipd}</h2>
              <button onClick={closeModal} className={styles.modalCloseButton}>
                ×
              </button>
            </div>
            <div className={styles.modalBody}>
              <div className={styles.dataComparison}>
                <div className={styles.dataColumn}>
                  <h3>Current Data (Table)</h3>
                  <div className={styles.dataItem}>
                    <span className={styles.dataLabel}>Tanggal:</span>
                    <span className={styles.dataValue}>
                      {formatDate(selectedRowData.tglApprovalGudang)}
                    </span>
                  </div>
                  <div className={styles.dataItem}>
                    <span className={styles.dataLabel}>Tipe:</span>
                    <span className={styles.dataValue}>
                      {selectedRowData.deskripsi || "-"}
                    </span>
                  </div>
                  <div className={styles.dataItem}>
                    <span className={styles.dataLabel}>Nama Item:</span>
                    <span className={styles.dataValue}>
                      {selectedRowData.namaItem || "-"}
                    </span>
                  </div>
                  <div className={styles.dataItem}>
                    <span className={styles.dataLabel}>Spesifikasi:</span>
                    <span className={styles.dataValue}>
                      {selectedRowData.spesifikasi || "-"}
                    </span>
                  </div>
                  <div className={styles.dataItem}>
                    <span className={styles.dataLabel}>Cons/Month:</span>
                    <span className={styles.dataValue}>
                      {selectedRowData.consumptionMonth || "-"}
                    </span>
                  </div>
                  <div className={styles.dataItem}>
                    <span className={styles.dataLabel}>Cons YTD:</span>
                    <span className={styles.dataValue}>
                      {formatNumber(selectedRowData.consumptionYTD)}
                    </span>
                  </div>
                  <div className={styles.dataItem}>
                    <span className={styles.dataLabel}>Today SR:</span>
                    <span className={styles.dataValue}>
                      {formatNumber(selectedRowData.todaySR)}
                    </span>
                  </div>
                  <div className={styles.dataItem}>
                    <span className={styles.dataLabel}>
                      Total Cons After SR:
                    </span>
                    <span className={styles.dataValue}>
                      {formatNumber(selectedRowData.totalConsumptionAfterSR)}
                    </span>
                  </div>
                  <div className={styles.dataItem}>
                    <span className={styles.dataLabel}>
                      Total Cons Per Month After SR:
                    </span>
                    <span className={styles.dataValue}>
                      {formatNumber(
                        selectedRowData.totalConsumptionPerMonthAfterSR,
                      )}
                    </span>
                  </div>
                  <div className={styles.dataItem}>
                    <span className={styles.dataLabel}>KodeSatuan:</span>
                    <span className={styles.dataValue}>
                      {selectedRowData.kodeSatuan || "-"}
                    </span>
                  </div>
                  <div className={styles.dataItem}>
                    <span className={styles.dataLabel}>Status:</span>
                    <span
                      className={`${styles.statusBadge} ${getStatusClass(selectedRowData.status)}`}
                    >
                      {selectedRowData.status}
                    </span>
                  </div>
                </div>

                <div className={styles.dataColumn}>
                  <h3>Previous Data</h3>
                  <div className={styles.dataItem}>
                    <span className={styles.dataLabel}>Tanggal:</span>
                    <span className={styles.dataValue}>
                      {formatDate(
                        selectedRowData.previousData.tglApprovalGudang,
                      )}
                    </span>
                  </div>
                  <div className={styles.dataItem}>
                    <span className={styles.dataLabel}>Tipe:</span>
                    <span className={styles.dataValue}>
                      {selectedRowData.previousData.deskripsi || "-"}
                    </span>
                  </div>
                  <div className={styles.dataItem}>
                    <span className={styles.dataLabel}>Nama Item:</span>
                    <span className={styles.dataValue}>
                      {selectedRowData.previousData.namaItem || "-"}
                    </span>
                  </div>
                  <div className={styles.dataItem}>
                    <span className={styles.dataLabel}>Spesifikasi:</span>
                    <span className={styles.dataValue}>
                      {selectedRowData.previousData.spesifikasi || "-"}
                    </span>
                  </div>
                  <div className={styles.dataItem}>
                    <span className={styles.dataLabel}>Cons/Month:</span>
                    <span className={styles.dataValue}>
                      {selectedRowData.previousData.consumptionMonth || "-"}
                    </span>
                  </div>
                  <div className={styles.dataItem}>
                    <span className={styles.dataLabel}>Cons YTD:</span>
                    <span className={styles.dataValue}>
                      {formatNumber(
                        selectedRowData.previousData.consumptionYTD,
                      )}
                    </span>
                  </div>
                  <div className={styles.dataItem}>
                    <span className={styles.dataLabel}>Today SR:</span>
                    <span className={styles.dataValue}>
                      {formatNumber(selectedRowData.previousData.todaySR)}
                    </span>
                  </div>
                  <div className={styles.dataItem}>
                    <span className={styles.dataLabel}>
                      Total Cons After SR:
                    </span>
                    <span className={styles.dataValue}>
                      {formatNumber(
                        selectedRowData.previousData.totalConsumptionAfterSR,
                      )}
                    </span>
                  </div>
                  <div className={styles.dataItem}>
                    <span className={styles.dataLabel}>
                      Total Cons Per Month After SR:
                    </span>
                    <span className={styles.dataValue}>
                      {formatNumber(
                        selectedRowData.previousData
                          .totalConsumptionPerMonthAfterSR,
                      )}
                    </span>
                  </div>
                  <div className={styles.dataItem}>
                    <span className={styles.dataLabel}>KodeSatuan:</span>
                    <span className={styles.dataValue}>
                      {selectedRowData.previousData.kodeSatuan || "-"}
                    </span>
                  </div>
                  <div className={styles.dataItem}>
                    <span className={styles.dataLabel}>Status:</span>
                    <span
                      className={`${styles.statusBadge} ${getStatusClass(selectedRowData.previousData.status)}`}
                    >
                      {selectedRowData.previousData.status}
                    </span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
