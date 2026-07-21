const pool = require('../config/database');

// =======================================
// Referral code generation
// =======================================

function generateReferralCode(name, id) {
  const base =
    (name || 'USER')
      .toUpperCase()
      .replace(/[^A-Z]/g, '')
      .slice(0, 8) || 'USER';

  return `${base}${id}${new Date().getFullYear()}`;
}

// =======================================
// Get or create rewards record
// =======================================

async function getOrCreateUserRewards(user) {
  const userId = Number(user.id);

  await pool.execute(
    `
        INSERT INTO rewards (
            userId,
            points,
            freeHours,
            rides,
            totalMinutes,
            referralCode,
            friendsReferred,
            referredBy
        )
        VALUES (?, 0, 0, 0, 0, ?, 0, NULL)
        ON DUPLICATE KEY UPDATE
            userId = VALUES(userId)
        `,
    [userId, generateReferralCode(user.name, userId)]
  );

  const [rows] = await pool.execute(
    `
        SELECT
            userId,
            points,
            freeHours,
            rides,
            totalMinutes,
            referralCode,
            friendsReferred,
            referredBy
        FROM rewards
        WHERE userId = ?
        LIMIT 1
        `,
    [userId]
  );

  const reward = rows[0];

  return {
    ...reward,
    points: Number(reward.points),
    freeHours: Number(reward.freeHours),
    rides: Number(reward.rides),
    totalMinutes: Number(reward.totalMinutes),
    friendsReferred: Number(reward.friendsReferred),
  };
}

// =======================================
// Points calculation
// =======================================

function calculatePoints(minutes) {
  const numericMinutes = Number(minutes);
  const roundedMinutes = Math.floor(numericMinutes);

  if (roundedMinutes < 10) {
    return {
      points: 0,
      roundedMinutes,
      originalMinutes: numericMinutes,
      message: 'Ride too short (need at least 10 min)',
    };
  }

  let points = Math.floor(roundedMinutes / 10);

  if (roundedMinutes >= 60) {
    points = Math.max(points, 15);
  }

  return {
    points,
    roundedMinutes,
    originalMinutes: numericMinutes,
    message: `Earned ${points} points for ${roundedMinutes}min ride`,
  };
}

// =======================================
// Add ride points
// =======================================

async function addRidePoints(user, minutes) {
  const result = calculatePoints(minutes);

  if (result.points === 0) {
    return {
      success: false,
      points: 0,
      message: result.message,
      transaction: null,
    };
  }

  const connection = await pool.getConnection();

  try {
    await connection.beginTransaction();

    const referralCode = generateReferralCode(user.name, user.id);

    await connection.execute(
      `
            INSERT INTO rewards (
                userId,
                points,
                freeHours,
                rides,
                totalMinutes,
                referralCode,
                friendsReferred,
                referredBy
            )
            VALUES (?, 0, 0, 0, 0, ?, 0, NULL)
            ON DUPLICATE KEY UPDATE
                userId = VALUES(userId)
            `,
      [user.id, referralCode]
    );

    await connection.execute(
      `
            UPDATE rewards
            SET
                points = points + ?,
                totalMinutes = totalMinutes + ?,
                rides = rides + 1
            WHERE userId = ?
            `,
      [result.points, result.roundedMinutes, user.id]
    );

    const hours = Math.floor(result.roundedMinutes / 60);

    const mins = result.roundedMinutes % 60;

    const timeString = hours > 0 ? `${hours}h ${mins}m` : `${mins}m`;

    const description =
      `Ride ${timeString} ` +
      `(${result.originalMinutes.toFixed(1)} min rounded down)`;

    const [transactionResult] = await connection.execute(
      `
                INSERT INTO reward_transactions (
                    userId,
                    points,
                    type,
                    description
                )
                VALUES (?, ?, 'earned', ?)
                `,
      [user.id, result.points, description]
    );

    const [rewardRows] = await connection.execute(
      `
            SELECT points
            FROM rewards
            WHERE userId = ?
            `,
      [user.id]
    );

    await connection.commit();

    return {
      success: true,
      points: result.points,
      newBalance: Number(rewardRows[0].points),
      roundedMinutes: result.roundedMinutes,
      originalMinutes: result.originalMinutes,
      message: `🎉 Earned ${result.points} points!`,
      transaction: {
        id: transactionResult.insertId,
        userId: Number(user.id),
        points: result.points,
        type: 'earned',
        desc: description,
        date: new Date().toLocaleString(),
      },
    };
  } catch (error) {
    await connection.rollback();
    throw error;
  } finally {
    connection.release();
  }
}

// =======================================
// Process referral
// =======================================

async function processReferral(user, referredByCode) {
  const code = String(referredByCode).trim().toUpperCase();

  const connection = await pool.getConnection();

  try {
    await connection.beginTransaction();

    const ownReferralCode = generateReferralCode(user.name, user.id);

    await connection.execute(
      `
            INSERT INTO rewards (
                userId,
                points,
                freeHours,
                rides,
                totalMinutes,
                referralCode,
                friendsReferred,
                referredBy
            )
            VALUES (?, 0, 0, 0, 0, ?, 0, NULL)
            ON DUPLICATE KEY UPDATE
                userId = VALUES(userId)
            `,
      [user.id, ownReferralCode]
    );

    const [userRewardRows] = await connection.execute(
      `
                SELECT
                    userId,
                    points,
                    referredBy
                FROM rewards
                WHERE userId = ?
                FOR UPDATE
                `,
      [user.id]
    );

    const userReward = userRewardRows[0];

    if (userReward.referredBy) {
      await connection.rollback();

      return {
        success: false,
        message: 'You already used a referral code!',
      };
    }

    const [referrerRows] = await connection.execute(
      `
                SELECT
                    r.userId,
                    r.points,
                    r.friendsReferred,
                    r.referralCode,
                    u.name
                FROM rewards r
                INNER JOIN users u
                    ON u.id = r.userId
                WHERE UPPER(r.referralCode) = ?
                LIMIT 1
                FOR UPDATE
                `,
      [code]
    );

    const referrer = referrerRows[0];

    if (!referrer) {
      await connection.rollback();

      return {
        success: false,
        message: 'Invalid referral code.',
      };
    }

    if (Number(referrer.userId) === Number(user.id)) {
      await connection.rollback();

      return {
        success: false,
        message: 'You cannot use your own code!',
      };
    }

    const referrerPoints = Number(referrer.friendsReferred) === 0 ? 20 : 5;

    await connection.execute(
      `
            UPDATE rewards
            SET
                friendsReferred =
                    friendsReferred + 1,
                points = points + ?
            WHERE userId = ?
            `,
      [referrerPoints, referrer.userId]
    );

    await connection.execute(
      `
            UPDATE rewards
            SET
                referredBy = ?,
                points = points + 5
            WHERE userId = ?
            `,
      [code, user.id]
    );

    await connection.execute(
      `
            INSERT INTO reward_transactions (
                userId,
                points,
                type,
                description
            )
            VALUES (?, ?, 'earned', ?)
            `,
      [
        referrer.userId,
        referrerPoints,
        `Referral bonus: ${user.name} used your code!`,
      ]
    );

    await connection.execute(
      `
            INSERT INTO reward_transactions (
                userId,
                points,
                type,
                description
            )
            VALUES (?, 5, 'earned', ?)
            `,
      [user.id, 'Welcome bonus: Used a referral code!']
    );

    const [updatedRows] = await connection.execute(
      `
                SELECT points
                FROM rewards
                WHERE userId = ?
                `,
      [user.id]
    );

    await connection.commit();

    return {
      success: true,
      message: `You got 5 points and they got ` + `${referrerPoints} points!`,
      pointsEarned: referrerPoints,
      newPoints: Number(updatedRows[0].points),
    };
  } catch (error) {
    await connection.rollback();
    throw error;
  } finally {
    connection.release();
  }
}

// =======================================
// Redeem reward
// =======================================

async function redeem(user, rewardPoints) {
  const pointsToRedeem = Number(rewardPoints);

  const rewardOptions = {
    25: 0.5,
    50: 1,
    100: 2,
  };

  const hours = rewardOptions[pointsToRedeem];

  if (!hours) {
    return {
      success: false,
      message: 'Invalid reward option.',
    };
  }

  const connection = await pool.getConnection();

  try {
    await connection.beginTransaction();

    const referralCode = generateReferralCode(user.name, user.id);

    await connection.execute(
      `
            INSERT INTO rewards (
                userId,
                points,
                freeHours,
                rides,
                totalMinutes,
                referralCode,
                friendsReferred,
                referredBy
            )
            VALUES (?, 0, 0, 0, 0, ?, 0, NULL)
            ON DUPLICATE KEY UPDATE
                userId = VALUES(userId)
            `,
      [user.id, referralCode]
    );

    const [rows] = await connection.execute(
      `
            SELECT
                points,
                freeHours
            FROM rewards
            WHERE userId = ?
            FOR UPDATE
            `,
      [user.id]
    );

    const record = rows[0];

    if (Number(record.points) < pointsToRedeem) {
      await connection.rollback();

      return {
        success: false,
        message:
          `Not enough points. Need ` +
          `${pointsToRedeem}, have ${record.points}`,
      };
    }

    await connection.execute(
      `
            UPDATE rewards
            SET
                points = points - ?,
                freeHours = freeHours + ?
            WHERE userId = ?
            `,
      [pointsToRedeem, hours, user.id]
    );

    await connection.execute(
      `
            INSERT INTO reward_transactions (
                userId,
                points,
                type,
                description
            )
            VALUES (?, ?, 'redeemed', ?)
            `,
      [
        user.id,
        pointsToRedeem,
        `Redeemed ${pointsToRedeem} pts for ${hours}h free`,
      ]
    );

    const [updatedRows] = await connection.execute(
      `
                SELECT
                    points,
                    freeHours
                FROM rewards
                WHERE userId = ?
                `,
      [user.id]
    );

    await connection.commit();

    return {
      success: true,
      message:
        `🎉 Redeemed ${pointsToRedeem} points ` + `for ${hours}h free ride!`,
      newPoints: Number(updatedRows[0].points),
      freeHours: Number(updatedRows[0].freeHours),
    };
  } catch (error) {
    await connection.rollback();
    throw error;
  } finally {
    connection.release();
  }
}

// =======================================
// User transaction history
// =======================================

async function getUserTransactions(userId) {
  const [rows] = await pool.execute(
    `
        SELECT
            id,
            userId,
            points,
            type,
            description AS \`desc\`,
            createdAt AS \`date\`
        FROM reward_transactions
        WHERE userId = ?
        ORDER BY createdAt DESC, id DESC
        `,
    [userId]
  );

  return rows.map((transaction) => ({
    ...transaction,
    userId: Number(transaction.userId),
    points: Number(transaction.points),
  }));
}

module.exports = {
  getOrCreateUserRewards,
  calculatePoints,
  addRidePoints,
  processReferral,
  redeem,
  getUserTransactions,
};
