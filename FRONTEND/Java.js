document.addEventListener("DOMContentLoaded", () => {
    const API_URL = "http://localhost:3000/api/transactions";
    let currentPage = 1;

    // DOM Elements
    const monthInput = document.getElementById("monthInput");
    const searchInput = document.getElementById("searchInput");
    const transactionsList = document.getElementById("transactionsList");
    const prevPageButton = document.getElementById("prevPage");
    const nextPageButton = document.getElementById("nextPage");
    const totalSaleAmount = document.getElementById("totalSaleAmount");
    const soldItemsCount = document.getElementById("soldItemsCount");
    const notSoldItemsCount = document.getElementById("notSoldItemsCount");
    const barChartCanvas = document.getElementById("barChart").getContext("2d");

    // Fetch Transactions for the selected month
    async function fetchTransactions(month, page = 1, search = "") {
        try {
            const response = await fetch(`${API_URL}/transactions?month=${month}&page=${page}&search=${search}`);
            const data = await response.json();
            displayTransactions(data);
        } catch (error) {
            alert("Error fetching transactions.");
        }
    }

    // Fetch Statistics for the selected month
    async function fetchStatistics(month) {
        try {
            const response = await fetch(`${API_URL}/statistics?month=${month}`);
            const data = await response.json();

            totalSaleAmount.textContent = data.totalSaleAmount;
            soldItemsCount.textContent = data.soldCount;
            notSoldItemsCount.textContent = data.notSoldCount;
        } catch (error) {
            alert("Error fetching statistics.");
        }
    }

    // Fetch Bar Chart Data for the selected month
    async function fetchBarChartData(month) {
        try {
            const response = await fetch(`${API_URL}/barChart?month=${month}`);
            const data = await response.json();
            renderBarChart(data);
        } catch (error) {
            alert("Error fetching bar chart data.");
        }
    }

    // Render Transactions Table
    function displayTransactions(transactions) {
        transactionsList.innerHTML = "";
        transactions.forEach(transaction => {
            const row = document.createElement("tr");
            row.innerHTML = `
                <td>${transaction.title}</td>
                <td>${transaction.description}</td>
                <td>${transaction.price}</td>
                <td>${new Date(transaction.dateOfSale).toLocaleDateString()}</td>
            `;
            transactionsList.appendChild(row);
        });
    }

    // Render Bar Chart
    function renderBarChart(data) {
        new Chart(barChartCanvas, {
            type: "bar",
            data: {
                labels: data.map(item => item.range),
                datasets: [{
                    label: 'Number of Items',
                    data: data.map(item => item.count),
                    backgroundColor: "#007bff",
                    borderColor: "#0056b3",
                    borderWidth: 1,
                }],
            },
            options: {
                scales: {
                    y: { beginAtZero: true },
                },
            },
        });
    }

    // Update all data for the selected month
    function updateData(month) {
        fetchTransactions(month, currentPage);
        fetchStatistics(month);
        fetchBarChartData(month);
    }

    // Event Listeners
    monthInput.addEventListener("change", () => {
        const selectedMonth = monthInput.value;
        updateData(selectedMonth);
    });

    searchInput.addEventListener("input", async () => {
        const month = monthInput.value;
        const search = searchInput.value;
        await fetchTransactions(month, currentPage, search);
    });

    prevPageButton.addEventListener("click", () => {
        if (currentPage > 1) {
            currentPage--;
            const selectedMonth = monthInput.value;
            updateData(selectedMonth);
        }
    });

    nextPageButton.addEventListener("click", () => {
        currentPage++;
        const selectedMonth = monthInput.value;
        updateData(selectedMonth);
    });

    // Initialize with default month (March)
    updateData("March");
});
