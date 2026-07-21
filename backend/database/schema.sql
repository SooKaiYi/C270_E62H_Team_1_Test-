CREATE TABLE IF NOT EXISTS users (
    id INT PRIMARY KEY,
    email VARCHAR(255) NOT NULL UNIQUE,
    password VARCHAR(255) NOT NULL,
    name VARCHAR(100) NOT NULL,
    role VARCHAR(50) NOT NULL
);

CREATE TABLE IF NOT EXISTS bikes (
    id INT PRIMARY KEY,
    name VARCHAR(100) NOT NULL,
    description TEXT,
    price DECIMAL(10, 2) NOT NULL,
    status VARCHAR(50) NOT NULL,
    image TEXT
);

CREATE TABLE IF NOT EXISTS bike_stations (
    id INT AUTO_INCREMENT PRIMARY KEY,
    name VARCHAR(100) NOT NULL UNIQUE,
    latitude DECIMAL(10, 7) NOT NULL,
    longitude DECIMAL(10, 7) NOT NULL
);

CREATE TABLE IF NOT EXISTS rentals (
    id INT PRIMARY KEY,
    userId INT NOT NULL,
    userName VARCHAR(100) NOT NULL,
    bikeId INT NOT NULL,
    bikeName VARCHAR(100) NOT NULL,
    amount DECIMAL(10, 2) NOT NULL,
    status VARCHAR(50) NOT NULL,
    rentedAt DATETIME(3) NOT NULL,
    returnedAt DATETIME(3) NULL,

    CONSTRAINT fk_rentals_user
        FOREIGN KEY (userId)
        REFERENCES users(id),

    CONSTRAINT fk_rentals_bike
        FOREIGN KEY (bikeId)
        REFERENCES bikes(id)
);

CREATE TABLE IF NOT EXISTS wallets (
    userId INT PRIMARY KEY,
    balance DECIMAL(10, 2) NOT NULL DEFAULT 0,
    tripCredits INT NOT NULL DEFAULT 0,
    dayPassCredits INT NOT NULL DEFAULT 0,

    CONSTRAINT fk_wallets_user
        FOREIGN KEY (userId)
        REFERENCES users(id)
);

CREATE TABLE IF NOT EXISTS wallet_transactions (
    transactionId INT PRIMARY KEY,
    userId INT NOT NULL,
    type VARCHAR(100) NOT NULL,
    amount DECIMAL(10, 2) NOT NULL,
    balanceAfter DECIMAL(10, 2) NOT NULL,
    status VARCHAR(50) NOT NULL,
    timestamp DATETIME(3) NOT NULL,

    CONSTRAINT fk_wallet_transactions_user
        FOREIGN KEY (userId)
        REFERENCES users(id)
);

CREATE TABLE IF NOT EXISTS rewards (
    userId INT PRIMARY KEY,
    points INT NOT NULL DEFAULT 0,
    freeHours INT NOT NULL DEFAULT 0,
    rides INT NOT NULL DEFAULT 0,
    totalMinutes INT NOT NULL DEFAULT 0,
    referralCode VARCHAR(100),
    friendsReferred INT NOT NULL DEFAULT 0,
    referredBy VARCHAR(100) NULL,

    CONSTRAINT fk_rewards_user
        FOREIGN KEY (userId)
        REFERENCES users(id)
);

CREATE TABLE IF NOT EXISTS leaderboard (
    userId INT PRIMARY KEY,
    userName VARCHAR(100) NOT NULL,
    city VARCHAR(100),
    bikeName VARCHAR(100),
    distance DECIMAL(10, 2) NOT NULL DEFAULT 0,
    rides INT NOT NULL DEFAULT 0,
    lastRideAt DATETIME(3) NULL,

    CONSTRAINT fk_leaderboard_user
        FOREIGN KEY (userId)
        REFERENCES users(id)
);

CREATE TABLE IF NOT EXISTS tracker (
    userId INT PRIMARY KEY,
    userName VARCHAR(100) NOT NULL,
    city VARCHAR(100),
    bikeName VARCHAR(100),
    distance DECIMAL(10, 2) NOT NULL DEFAULT 0,
    rides INT NOT NULL DEFAULT 0,
    lastRideAt DATETIME(3) NULL,

    CONSTRAINT fk_tracker_user
        FOREIGN KEY (userId)
        REFERENCES users(id)
);

CREATE TABLE IF NOT EXISTS bike_repair_reports (
    id BIGINT PRIMARY KEY,
    bikeStation VARCHAR(100) NOT NULL,
    bikeID VARCHAR(50) NOT NULL,
    issueType VARCHAR(100) NOT NULL,
    description TEXT,
    status VARCHAR(50) NOT NULL,
    reportDate VARCHAR(100) NOT NULL
);

CREATE TABLE IF NOT EXISTS transactions (
    id INT AUTO_INCREMENT PRIMARY KEY,
    userId INT NULL,
    type VARCHAR(100),
    amount DECIMAL(10, 2),
    status VARCHAR(50),
    createdAt DATETIME(3) DEFAULT CURRENT_TIMESTAMP(3),

    CONSTRAINT fk_transactions_user
        FOREIGN KEY (userId)
        REFERENCES users(id)
);