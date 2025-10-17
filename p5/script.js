// Invoice dengan p5.js
// Setup canvas dan styling

let invoiceData = {
    orderId: "ORD-dpsk548sc-B2RBUD",
    produk: "NodeJS Panel Node 1",
    harga: "15.000",
    url: "https://panel.kanata.web.id/auth/login",
    username: "ryuucode",
    email: "vgknfzhhc@gmail.com",
    password: "1",
    whatsapp: "https://wa.me/62895395590009"
};

function setup() {
    createCanvas(800, 1000);
    background(255);
    noLoop();
}

function draw() {
    background(245, 245, 250);

    // Header
    drawHeader();

    // Garis pembatas atas
    drawLine(50, 120);

    // Informasi Order
    drawOrderInfo();

    // Detail Akses Panel
    drawPanelAccess();

    // Garis pembatas bawah
    drawLine(50, 520);

    // Success Message
    drawSuccessMessage();

    // Panduan Login
    drawLoginGuide();

    // Perhatian/Warning
    drawWarning();

    // Support/Help
    drawSupport();
}

function drawHeader() {
    // Judul Invoice
    fill(0);
    textSize(32);
    textStyle(BOLD);
    textAlign(CENTER);
    text("INVOICE", width / 2, 50);

    // Subtitle
    fill(100);
    textSize(14);
    textStyle(NORMAL);
    text("Order Confirmation", width / 2, 80);
}

function drawLine(x, y) {
    stroke(150);
    strokeWeight(2);
    line(x, y, width - x, y);
    noStroke();
}

function drawOrderInfo() {
    let startY = 150;
    textAlign(LEFT);

    // Order ID dengan emoji
    fill(0);
    textSize(16);
    textStyle(BOLD);
    text("Order ID:", 70, startY);
    textStyle(NORMAL);
    fill(50);
    text(invoiceData.orderId, 180, startY);

    // Produk
    fill(0);
    textStyle(BOLD);
    text("Produk:", 70, startY + 40);
    textStyle(NORMAL);
    fill(50);
    text(invoiceData.produk, 180, startY + 40);

    // Harga
    fill(0);
    textStyle(BOLD);
    text("Harga:", 70, startY + 70);
    textStyle(NORMAL);
    fill(0, 150, 0);
    textSize(20);
    text("Rp " + invoiceData.harga, 180, startY + 70);
}

function drawPanelAccess() {
    let startY = 290;

    // Header section
    fill(30, 144, 255);
    rect(50, startY, width - 100, 40, 5);

    fill(255);
    textSize(18);
    textStyle(BOLD);
    textAlign(LEFT);
    text("DETAIL AKSES PANEL", 70, startY + 25);

    // Background untuk detail
    fill(255);
    rect(50, startY + 40, width - 100, 140, 5);

    // Detail akses
    textAlign(LEFT);
    let detailY = startY + 70;

    // URL Panel
    fill(0);
    textSize(14);
    textStyle(BOLD);
    text("URL Panel:", 70, detailY);
    textStyle(NORMAL);
    fill(0, 0, 255);
    text(invoiceData.url, 180, detailY);
    // Username
    fill(0);
    textStyle(BOLD);
    text("Username:", 70, detailY + 20);
    textStyle(NORMAL);
    fill(50);
    text(invoiceData.username, 180, detailY + 20);

    // Email
    fill(0);
    textStyle(BOLD);
    text("Email:", 70, detailY + 80);
    textStyle(NORMAL);
    fill(50);
    text(invoiceData.email, 180, detailY + 80);
    // Password
    fill(0);
    textStyle(BOLD);
    text("Password:", 70, detailY + 110);
    textStyle(NORMAL);
    fill(50);
    text(invoiceData.password, 180, detailY + 110);
}

function drawSuccessMessage() {
    fill(0, 200, 0);
    textSize(18);
    textStyle(BOLD);
    textAlign(CENTER);
    text("✨ Server Anda sudah siap digunakan!", width / 2, 560);
}

function drawLoginGuide() {
    let startY = 600;

    fill(0);
    textSize(16);
    textStyle(BOLD);
    textAlign(LEFT);
    text("💡 Panduan Login:", 70, startY);

    textSize(14);
    textStyle(NORMAL);
    fill(50);
    text("1. Buka link panel di atas", 90, startY + 30);
    text("2. Login dengan email dan password yang diberikan", 90, startY + 55);
    text("3. Server Anda akan muncul di dashboard", 90, startY + 80);
}

function drawWarning() {
    let startY = 710;

    // Background warning
    fill(255, 240, 200);
    rect(50, startY - 10, width - 100, 140, 5);

    fill(200, 100, 0);
    textSize(16);
    textStyle(BOLD);
    textAlign(LEFT);
    text("⚠️ Perhatian:", 70, startY + 15);

    textSize(13);
    textStyle(NORMAL);
    fill(100);
    text("• Paket sudah termasuk Garansi 30 hari", 70, startY + 45);
    text("• Dilarang menggunakan panel untuk DDOS, Mining,dan aktivitas Ilegal lainnya", 70, startY + 65);
    text("  ", 70, startY + 82);
    text("• Jaga keamanan akun anda, segera ganti password", 70, startY + 82);
    text("  default setelah login pertama berhasil", 70, startY + 102);
}

function drawSupport() {
    let startY = 880;

    fill(30, 144, 255);
    textSize(16);
    textStyle(BOLD);
    textAlign(CENTER);
    text("Butuh bantuan? Hubungi admin", width / 2, startY);

    fill(0, 0, 255);
    textStyle(NORMAL);
    textSize(14);
    text(invoiceData.whatsapp, width / 2, startY + 30);

    // Footer
    fill(150);
    textSize(12);
    textStyle(ITALIC);
    text("Terima kasih atas pembelian Anda", width / 2, startY + 70);
}
