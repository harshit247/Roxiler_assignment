const express = require('express');
const axios = require('axios');
const fs = require('fs').promises;
const path = require('path');
const app = express();

const DB_FILE = path.join(__dirname, 'database.json');

// Helper function to read data from the JSON file
async function readData() {
    try {
        const data = await fs.readFile(DB_FILE, 'utf8');
        return JSON.parse(data);
    } catch (error) {
        return [];  // If file doesn't exist or is empty, return an empty array
    }
}

// Helper function to write data to the JSON file
async function writeData(data) {
    try {
        await fs.writeFile(DB_FILE, JSON.stringify(data, null, 2));
    } catch (error) {
        console.error('Error writing data to file:', error);
    }
}

// Middleware to parse incoming JSON requests
app.use(express.json());

// API to initialize the database (fetch from a third-party API)
app.get('/api/initialize', async (req, res) => {
    try {
        const response = await axios.get('https://s3.amazonaws.com/roxiler.com/product_transaction.json');
        const transactions = response.data;
        await writeData(transactions);
        res.status(200).send('Database initialized with seed data');
    } catch (error) {
        res.status(500).json({ message: 'Error initializing database', error });
    }
});

// API to list transactions with search and pagination
app.get('/api/transactions', async (req, res) => {
    const { search = '', page = 1, perPage = 10 } = req.query;
    const offset = (page - 1) * perPage;

    try {
        const data = await readData();
        let filteredData = data;

        if (search) {
            filteredData = data.filter(item =>
                item.title.toLowerCase().includes(search.toLowerCase()) ||
                item.description.toLowerCase().includes(search.toLowerCase()) ||
                item.price.toString().includes(search)
            );
        }

        const paginatedData = filteredData.slice(offset, offset + parseInt(perPage));
        res.json(paginatedData);
    } catch (error) {
        res.status(500).json({ message: 'Error fetching transactions', error });
    }
});

// API for statistics (total sales, sold items, and unsold items for the selected month)
app.get('/api/statistics', async (req, res) => {
    const { month } = req.query;
    const monthIndex = new Date(`${month} 1, 2000`).getMonth() + 1;

    try {
        const data = await readData();
        const filteredData = data.filter(item =>
            new Date(item.dateOfSale).getMonth() + 1 === monthIndex
        );

        const totalSaleAmount = filteredData.reduce((sum, item) => item.sold ? sum + item.price : sum, 0);
        const soldCount = filteredData.filter(item => item.sold).length;
        const notSoldCount = filteredData.length - soldCount;

        res.json({ totalSaleAmount, soldCount, notSoldCount });
    } catch (error) {
        res.status(500).json({ message: 'Error fetching statistics', error });
    }
});

// API for bar chart data based on price ranges for the selected month
app.get('/api/bar-chart', async (req, res) => {
    const { month } = req.query;
    const monthIndex = new Date(`${month} 1, 2000`).getMonth() + 1;

    const ranges = [
        { label: '0-100', min: 0, max: 100 },
        { label: '101-200', min: 101, max: 200 },
        { label: '201-300', min: 201, max: 300 },
        { label: '301-400', min: 301, max: 400 },
        { label: '401-500', min: 401, max: 500 },
        { label: '501-600', min: 501, max: 600 },
        { label: '601-700', min: 601, max: 700 },
        { label: '701-800', min: 701, max: 800 },
        { label: '801-900', min: 801, max: 900 },
        { label: '901-above', min: 901, max: Infinity }
    ];

    try {
        const data = await readData();
        const filteredData = data.filter(item =>
            new Date(item.dateOfSale).getMonth() + 1 === monthIndex
        );

        const rangeCounts = ranges.map(({ label, min, max }) => {
            const count = filteredData.filter(item => item.price >= min && item.price <= max).length;
            return { range: label, count };
        });

        res.json(rangeCounts);
    } catch (error) {
        res.status(500).json({ message: 'Error generating bar chart data', error });
    }
});

// API for pie chart data based on unique categories for the selected month
app.get('/api/pie-chart', async (req, res) => {
    const { month } = req.query;
    const monthIndex = new Date(`${month} 1, 2000`).getMonth() + 1;

    try {
        const data = await readData();
        const filteredData = data.filter(item =>
            new Date(item.dateOfSale).getMonth() + 1 === monthIndex
        );

        const categoryCounts = filteredData.reduce((acc, item) => {
            acc[item.category] = (acc[item.category] || 0) + 1;
            return acc;
        }, {});

        res.json(categoryCounts);
    } catch (error) {
        res.status(500).json({ message: 'Error generating pie chart data', error });
    }
});

// Combined API to fetch data from all the previous APIs
app.get('/api/combined', async (req, res) => {
    const { month } = req.query;

    try {
        const [transactions, statistics, barChart, pieChart] = await Promise.all([
            axios.get(`http://localhost:3000/api/transactions?month=${month}`),
            axios.get(`http://localhost:3000/api/statistics?month=${month}`),
            axios.get(`http://localhost:3000/api/bar-chart?month=${month}`),
            axios.get(`http://localhost:3000/api/pie-chart?month=${month}`)
        ]);

        res.json({
            transactions: transactions.data,
            statistics: statistics.data,
            barChart: barChart.data,
            pieChart: pieChart.data
        });
    } catch (error) {
        res.status(500).json({ message: 'Error fetching combined data', error });
    }
});

// Start the server
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
    console.log(`Server is running on port ${PORT}`);
});
