// In-memory mock standing in for the real mysql2 pool, covering every table
// used across bikeModel, walletModel, rentalModel, trackerModel,
// leaderboardModel, adminWalletModel, and bikeRepairFeatureController.
// Exposes `_store()` and `_reset()` so tests can seed data and reset state.

let store;

function reset() {
  store = {
    users: [
      {
        id: 1,
        name: 'Administrator',
        email: 'admin@bikeapp.com',
        role: 'Admin',
      },
      {
        id: 2,
        name: 'Member User',
        email: 'member@bikeapp.com',
        role: 'Member',
      },
      { id: 3, name: 'jason', email: 'jason@bikeapp.com', role: 'Member' },
    ],
    bikes: [],
    wallets: [],
    wallet_transactions: [],
    rentals: [],
    tracker: [],
    leaderboard: [],
    bike_repair_reports: [],
    rewards: [],
    reward_transactions: [],
    nextBikeId: 1,
    nextWalletTxnId: 1,
    nextRentalId: 1,
    nextRepairId: 1,
    nextTransactionId: 1,
  };
}
reset();

function findBike(id) {
  return store.bikes.find((b) => Number(b.id) === Number(id));
}
function findWallet(userId) {
  return store.wallets.find((w) => Number(w.userId) === Number(userId));
}
function findRental(id) {
  return store.rentals.find((r) => Number(r.id) === Number(id));
}

function upsertWalletShell(userId) {
  if (!findWallet(userId)) {
    store.wallets.push({
      userId: Number(userId),
      balance: 0,
      tripCredits: 0,
      dayPassCredits: 0,
    });
  }
}

async function execute(sql, params = []) {
  const q = sql.replace(/\s+/g, ' ').trim();

  // ============ BIKES ============
  if (q.includes('INSERT INTO bikes')) {
    const [name, description, price, status, image] = params;
    const id = store.nextBikeId++;
    store.bikes.push({ id, name, description, price, status, image });
    return [{ insertId: id, affectedRows: 1 }];
  }
  if (
    q.includes('UPDATE bikes') &&
    q.includes('SET') &&
    q.includes('name = ?')
  ) {
    const [name, description, price, status, image, id] = params;
    const bike = findBike(id);
    if (!bike) return [{ affectedRows: 0 }];
    Object.assign(bike, { name, description, price, status, image });
    return [{ affectedRows: 1 }];
  }
  if (q.includes('UPDATE bikes') && q.includes("SET status = 'Rented'")) {
    const [id] = params;
    const bike = findBike(id);
    if (bike) bike.status = 'Rented';
    return [{ affectedRows: bike ? 1 : 0 }];
  }
  if (q.includes('UPDATE bikes') && q.includes("SET status = 'Available'")) {
    const [id] = params;
    const bike = findBike(id);
    if (bike) bike.status = 'Available';
    return [{ affectedRows: bike ? 1 : 0 }];
  }
  if (q.includes('UPDATE bikes') && q.includes('SET status = ?')) {
    const [status, id] = params;
    const bike = findBike(id);
    if (!bike) return [{ affectedRows: 0 }];
    bike.status = status;
    return [{ affectedRows: 1 }];
  }
  if (q.includes('DELETE FROM bikes')) {
    const [id] = params;
    const before = store.bikes.length;
    store.bikes = store.bikes.filter((b) => Number(b.id) !== Number(id));
    return [{ affectedRows: before === store.bikes.length ? 0 : 1 }];
  }
  if (q.includes('FROM bikes') && q.includes('WHERE id = ?')) {
    const [id] = params;
    const bike = findBike(id);
    return [bike ? [{ ...bike }] : []];
  }
  if (q.includes('FROM bikes') && q.includes('ORDER BY id')) {
    return [[...store.bikes]];
  }

  // ============ WALLETS ============
  if (q.includes('INSERT INTO wallets')) {
    const [userId] = params;
    upsertWalletShell(userId);
    return [{ affectedRows: 1 }];
  }
  if (
    q.includes('UPDATE wallets') &&
    q.includes('tripCredits = ?') &&
    q.includes('dayPassCredits = ?') &&
    q.includes('balance = ?')
  ) {
    const [balance, tripCredits, dayPassCredits, userId] = params;
    const w = findWallet(userId);
    Object.assign(w, { balance, tripCredits, dayPassCredits });
    return [{ affectedRows: 1 }];
  }
  if (q.includes('UPDATE wallets') && q.includes('SET balance = ?')) {
    const [balance, userId] = params;
    const w = findWallet(userId);
    w.balance = balance;
    return [{ affectedRows: 1 }];
  }
  if (q.includes('FROM wallets') && q.includes('WHERE userId = ?')) {
    const [userId] = params;
    const w = findWallet(userId);
    return [w ? [{ ...w }] : []];
  }

  // ============ WALLET_TRANSACTIONS ============
  if (q.includes('INSERT INTO wallet_transactions') && q.includes('SELECT')) {
    // rentalModel's subquery-based insert (auto transactionId via MAX+1)
    const [userId, type, amount, balanceAfter] = params;
    const id = store.nextWalletTxnId++;
    store.wallet_transactions.push({
      transactionId: id,
      userId: Number(userId),
      type,
      amount,
      balanceAfter,
      status: 'Success',
      timestamp: new Date().toISOString(),
    });
    return [{ insertId: id, affectedRows: 1 }];
  }
  if (q.includes('INSERT INTO wallet_transactions')) {
    const [userId, type, amount, balanceAfter, status] = params;
    const id = store.nextWalletTxnId++;
    store.wallet_transactions.push({
      transactionId: id,
      userId: Number(userId),
      type,
      amount,
      balanceAfter,
      status,
      timestamp: new Date().toISOString(),
    });
    return [{ insertId: id, affectedRows: 1 }];
  }
  if (
    q.includes('FROM wallet_transactions') &&
    q.includes('WHERE userId = ?')
  ) {
    const [userId] = params;
    const rows = store.wallet_transactions
      .filter((t) => Number(t.userId) === Number(userId))
      .sort((a, b) => b.transactionId - a.transactionId);
    return [rows];
  }

  // ============ RENTALS ============
  if (q.includes('INSERT INTO rentals')) {
    const [userId, userName, bikeId, bikeName, amount, paymentMethod, status] =
      params;
    const id = store.nextRentalId++;
    store.rentals.push({
      id,
      userId,
      userName,
      bikeId,
      bikeName,
      amount,
      paymentMethod,
      status,
      rentedAt: new Date().toISOString(),
      returnedAt: null,
    });
    return [{ insertId: id, affectedRows: 1 }];
  }
  if (q.includes('UPDATE rentals') && q.includes("status = 'Returned'")) {
    const [id] = params;
    const r = findRental(id);
    r.status = 'Returned';
    r.returnedAt = new Date().toISOString();
    return [{ affectedRows: 1 }];
  }
  if (q.includes('UPDATE rentals') && q.includes('status = ?')) {
    const [status, returnedAt, id] = params;
    const r = findRental(id);
    if (!r) return [{ affectedRows: 0 }];
    r.status = status;
    r.returnedAt = returnedAt;
    return [{ affectedRows: 1 }];
  }
  if (q.includes('DELETE FROM rentals')) {
    const [id] = params;
    const before = store.rentals.length;
    store.rentals = store.rentals.filter((r) => Number(r.id) !== Number(id));
    return [{ affectedRows: before === store.rentals.length ? 0 : 1 }];
  }
  if (
    q.includes('SELECT *') &&
    q.includes('FROM rentals') &&
    q.includes('WHERE id = ?')
  ) {
    const [id] = params;
    const r = findRental(id);
    return [r ? [{ ...r }] : []];
  }
  if (q.includes('FROM rentals') && q.includes('WHERE id = ?')) {
    const [id] = params;
    const r = findRental(id);
    return [r ? [{ ...r }] : []];
  }
  if (q.includes('FROM rentals') && q.includes('bikeName IS NOT NULL')) {
    const [userId] = params;
    const rows = store.rentals
      .filter((r) => Number(r.userId) === Number(userId) && r.bikeName)
      .sort(
        (a, b) =>
          new Date(b.returnedAt || b.rentedAt) -
          new Date(a.returnedAt || a.rentedAt)
      );
    return [rows.length ? [rows[0]] : []];
  }
  if (q.includes('FROM rentals') && q.includes('WHERE userId = ?')) {
    const [userId] = params;
    const rows = store.rentals.filter(
      (r) => Number(r.userId) === Number(userId)
    );
    return [rows];
  }
  if (q.includes('FROM rentals') && q.includes('ORDER BY rentedAt')) {
    return [
      [...store.rentals].sort(
        (a, b) => new Date(b.rentedAt) - new Date(a.rentedAt)
      ),
    ];
  }

  // ============ TRACKER ============
  if (q.includes('INSERT INTO tracker')) {
    const [userId, userName, city, bikeName, distance] = params;
    let t = store.tracker.find((x) => Number(x.userId) === Number(userId));
    if (!t) {
      t = {
        userId: Number(userId),
        userName,
        city,
        bikeName,
        distance: Number(distance),
        rides: 1,
        lastRideAt: new Date().toISOString(),
      };
      store.tracker.push(t);
    } else {
      t.userName = userName;
      t.city = city;
      if (bikeName !== 'Unknown Bike') t.bikeName = bikeName;
      t.distance = Math.round((t.distance + Number(distance)) * 100) / 100;
      t.rides += 1;
      t.lastRideAt = new Date().toISOString();
    }
    return [{ affectedRows: 1 }];
  }
  if (q.includes('FROM tracker') && q.includes('WHERE userId = ?')) {
    const [userId] = params;
    const t = store.tracker.find((x) => Number(x.userId) === Number(userId));
    return [t ? [{ ...t }] : []];
  }
  if (q.includes('FROM tracker')) {
    return [
      [...store.tracker].sort(
        (a, b) => b.distance - a.distance || b.rides - a.rides
      ),
    ];
  }

  // ============ LEADERBOARD ============
  if (q.includes('INSERT INTO leaderboard')) {
    const [userId, userName, city, bikeName, distance, rides, lastRideAt] =
      params;
    let l = store.leaderboard.find((x) => Number(x.userId) === Number(userId));
    if (!l) {
      l = {
        userId: Number(userId),
        userName,
        city,
        bikeName,
        distance,
        rides,
        lastRideAt,
      };
      store.leaderboard.push(l);
    } else {
      Object.assign(l, {
        userName,
        city,
        bikeName,
        distance,
        rides,
        lastRideAt,
      });
    }
    return [{ affectedRows: 1 }];
  }
  if (q.includes('FROM leaderboard')) {
    return [
      [...store.leaderboard].sort(
        (a, b) => b.distance - a.distance || b.rides - a.rides
      ),
    ];
  }

  // ============ BIKE_REPAIR_REPORTS ============
  if (q.includes('INSERT INTO bike_repair_reports')) {
    const [bikeStation, bikeID, issueType, description, reportDate] = params;
    const id = store.nextRepairId++;
    store.bike_repair_reports.push({
      id,
      bikeStation,
      bikeID,
      issueType,
      description,
      status: 'Pending',
      date: reportDate,
    });
    return [{ insertId: id, affectedRows: 1 }];
  }
  if (q.includes('UPDATE bike_repair_reports')) {
    const [status, id] = params;
    const r = store.bike_repair_reports.find(
      (x) => Number(x.id) === Number(id)
    );
    if (!r) return [{ affectedRows: 0 }];
    r.status = status;
    return [{ affectedRows: 1 }];
  }
  if (q.includes('FROM bike_repair_reports')) {
    return [[...store.bike_repair_reports].sort((a, b) => b.id - a.id)];
  }

  // ============ REWARDS ============
  if (q.includes('INSERT INTO rewards')) {
    const [userId, referralCode] = params;
    if (!store.rewards.find((r) => Number(r.userId) === Number(userId))) {
      store.rewards.push({
        userId: Number(userId),
        points: 0,
        freeHours: 0,
        rides: 0,
        totalMinutes: 0,
        referralCode,
        friendsReferred: 0,
        referredBy: null,
      });
    }
    return [{ affectedRows: 1 }];
  }
  if (q.includes('UPDATE rewards') && q.includes('rides = rides + 1')) {
    const [points, minutes, userId] = params;
    const r = store.rewards.find((x) => Number(x.userId) === Number(userId));
    r.points += points;
    r.totalMinutes += minutes;
    r.rides += 1;
    return [{ affectedRows: 1 }];
  }
  if (
    q.includes('UPDATE rewards') &&
    q.includes('friendsReferred = friendsReferred + 1')
  ) {
    const [points, userId] = params;
    const r = store.rewards.find((x) => Number(x.userId) === Number(userId));
    r.friendsReferred += 1;
    r.points += points;
    return [{ affectedRows: 1 }];
  }
  if (q.includes('UPDATE rewards') && q.includes('referredBy = ?')) {
    const [code, userId] = params;
    const r = store.rewards.find((x) => Number(x.userId) === Number(userId));
    r.referredBy = code;
    r.points += 5;
    return [{ affectedRows: 1 }];
  }
  if (q.includes('UPDATE rewards') && q.includes('freeHours = freeHours + ?')) {
    const [points, hours, userId] = params;
    const r = store.rewards.find((x) => Number(x.userId) === Number(userId));
    r.points -= points;
    r.freeHours += hours;
    return [{ affectedRows: 1 }];
  }
  if (q.includes('FROM rewards') && q.includes('INNER JOIN users')) {
    const [code] = params;
    const r = store.rewards.find(
      (row) =>
        String(row.referralCode).toUpperCase() === String(code).toUpperCase()
    );
    if (!r) return [[]];
    const u = store.users.find((user) => user.id === r.userId);
    return [[{ ...r, name: u ? u.name : null }]];
  }
  if (q.includes('FROM rewards') && q.includes('FOR UPDATE')) {
    const [userId] = params;
    const r = store.rewards.find((x) => Number(x.userId) === Number(userId));
    return [r ? [{ ...r }] : []];
  }
  if (/^SELECT\s+points\s+FROM rewards/.test(q)) {
    const [userId] = params;
    const r = store.rewards.find((x) => Number(x.userId) === Number(userId));
    return [[{ points: r.points }]];
  }
  if (q.includes('FROM rewards') && q.includes('SELECT')) {
    const [userId] = params;
    const r = store.rewards.find((x) => Number(x.userId) === Number(userId));
    return [[{ ...r }]];
  }

  // ============ REWARD_TRANSACTIONS ============
  if (q.includes('INSERT INTO reward_transactions')) {
    const id = store.nextTransactionId++;
    let userId, points, type, description;
    if (q.includes("VALUES (?, 5, 'earned', ?)")) {
      [userId, description] = params;
      points = 5;
      type = 'earned';
    } else if (q.includes("'earned'")) {
      [userId, points, description] = params;
      type = 'earned';
    } else if (q.includes("'redeemed'")) {
      [userId, points, description] = params;
      type = 'redeemed';
    } else {
      [userId, points, type, description] = params;
    }
    store.reward_transactions.push({
      id,
      userId: Number(userId),
      points: Number(points),
      type,
      desc: description,
      date: new Date().toISOString(),
    });
    return [{ insertId: id }];
  }
  if (q.includes('FROM reward_transactions')) {
    const [userId] = params;
    const rows = store.reward_transactions
      .filter((t) => Number(t.userId) === Number(userId))
      .sort((a, b) => b.id - a.id);
    return [rows];
  }

  throw new Error(`Mock pool received an unrecognized query: ${q}`);
}

function getConnectionObject() {
  return {
    execute,
    beginTransaction: async () => {},
    commit: async () => {},
    rollback: async () => {},
    release: () => {},
  };
}

module.exports = {
  execute,
  getConnection: async () => getConnectionObject(),
  _store: () => store,
  _reset: reset,
};
