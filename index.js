const port = 4000;

const express = require("express");
const app = express();

const mongoose = require("mongoose");
const multer = require("multer");
const path = require("path");
const cors = require("cors");
const dns = require("dns");
const fs = require("fs");
const Product = require('./models/Product');

/* DNS */
dns.setServers(["8.8.8.8", "8.8.4.4"]);

/* MIDDLEWARE */
app.use(cors());

/* IMPORTANT */
app.use(express.urlencoded({ extended: true }));
app.use(express.json());
app.use(express.static('public'));

/* CREATE FOLDERS */
if (!fs.existsSync("./upload")) {
    fs.mkdirSync("./upload");
}

if (!fs.existsSync("./upload/images")) {
    fs.mkdirSync("./upload/images");
}

/* DATABASE */
mongoose.connect(
    "mongodb+srv://greatstackdev:abhaniabhaniabhani@cluster0.jrs65cu.mongodb.net/e-commerce"
)
.then(() => {
    console.log("MongoDB Connected");
})
.catch((error) => {
    console.log("MongoDB Error:", error);
});

/* HOME ROUTE */
app.get("/", (req, res) => {
    res.send("Express App is Running");
});

/* STORAGE */
const storage = multer.diskStorage({
    destination: function (req, file, cb) {
        cb(null, "./upload/images");
    },
    filename: function (req, file, cb) {
        cb(
            null,
            file.fieldname +
            "_" +
            Date.now() +
            path.extname(file.originalname)
        );
    }
});

/* UPLOAD */
const upload = multer({
    storage: storage
});

/* STATIC */
app.use("/images", express.static("upload/images"));

/* ========== UPLOAD API ========== */
app.post("/upload", upload.single("product"), (req, res) => {
    try {
        console.log(req.file);
        if (!req.file) {
            return res.status(400).json({
                success: 0,
                message: "No file uploaded"
            });
        }
        res.json({
            success: 1,
            image_url: `http://localhost:${port}/images/${req.file.filename}`
        });
    } catch (error) {
        console.log(error);
        res.status(500).json({
            success: 0,
            message: "Upload failed"
        });
    }
});

/* ========== ADMIN API ========== */

// 1. جلب كل المنتجات (READ)
app.get('/api/admin/products', async (req, res) => {
    try {
        const products = await Product.find().sort({ createdAt: -1 });
        res.json({ success: true, products });
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
});

// 2. إضافة منتج جديد (CREATE)
app.post('/api/admin/products', async (req, res) => {
    try {
        const { name, price, category, stock, description } = req.body;
        
        const newProduct = new Product({
            name,
            price,
            category,
            stock: stock || 0,
            description: description || ""
        });
        
        await newProduct.save();
        res.json({ success: true, product: newProduct });
        
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
});

// 3. تعديل منتج (UPDATE)
app.put('/api/admin/products/:id', async (req, res) => {
    try {
        const { id } = req.params;
        const updates = req.body;
        
        const updatedProduct = await Product.findByIdAndUpdate(id, updates, { new: true });
        
        if (!updatedProduct) {
            return res.status(404).json({ success: false, message: 'Product not found' });
        }
        
        res.json({ success: true, product: updatedProduct });
        
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
});

// 4. حذف منتج (DELETE)
app.delete('/api/admin/products/:id', async (req, res) => {
    try {
        const { id } = req.params;
        
        const deletedProduct = await Product.findByIdAndDelete(id);
        
        if (!deletedProduct) {
            return res.status(404).json({ success: false, message: 'Product not found' });
        }
        
        res.json({ success: true, message: 'Product deleted' });
        
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
});

/* SERVER */
app.listen(port, () => {
    console.log("Server Running on Port " + port);
});