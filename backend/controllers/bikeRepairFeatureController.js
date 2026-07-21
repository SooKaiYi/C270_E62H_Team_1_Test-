const pool = require('../config/database');

// =======================================
// Show Repair Form
// =======================================

exports.showRepairPage = (req, res) => {
  res.render('bikeRepairReportPage', {
    user: req.session.user,
  });
};

// =======================================
// Submit Repair Report
// =======================================

exports.submitRepairReport = async (req, res) => {
  try {
    const { bikeStation, bikeID, issueType, description } = req.body;

    if (!bikeStation || !bikeID || !issueType) {
      return res
        .status(400)
        .send('Bike station, bike ID and issue type are required.');
    }

    const reportDate = new Date().toLocaleString('en-SG');

    const [result] = await pool.execute(
      `
            INSERT INTO bike_repair_reports (
                bikeStation,
                bikeID,
                issueType,
                description,
                status,
                reportDate
            )
            VALUES (?, ?, ?, ?, 'Pending', ?)
            `,
      [
        bikeStation.trim(),
        bikeID.trim(),
        issueType.trim(),
        description?.trim() || '',
        reportDate,
      ]
    );

    const newReport = {
      id: result.insertId,
      bikeStation: bikeStation.trim(),
      bikeID: bikeID.trim(),
      issueType: issueType.trim(),
      description: description?.trim() || '',
      status: 'Pending',
      date: reportDate,
    };

    res.render('bikeRepairSubmittedPage', {
      report: newReport,
      user: req.session.user,
    });
  } catch (error) {
    console.error('Submit repair report error:', error);

    res.status(500).send('Unable to submit repair report.');
  }
};

// =======================================
// Admin Page
// =======================================

exports.showAdminPage = async (req, res) => {
  if (
    !req.session.user ||
    String(req.session.user.role).toLowerCase() !== 'admin'
  ) {
    return res.status(403).send('Access Denied');
  }

  try {
    const [rows] = await pool.execute(
      `
            SELECT
                id,
                bikeStation,
                bikeID,
                issueType,
                description,
                status,
                reportDate AS \`date\`
            FROM bike_repair_reports
            ORDER BY id DESC
            `
    );

    res.render('bikeRepairAdminPage', {
      reports: rows,
      user: req.session.user,
    });
  } catch (error) {
    console.error('Load repair reports error:', error);

    res.status(500).send('Unable to load repair reports.');
  }
};

// =======================================
// Update Repair Status
// =======================================

exports.updateRepairStatus = async (req, res) => {
  if (
    !req.session.user ||
    String(req.session.user.role).toLowerCase() !== 'admin'
  ) {
    return res.status(403).send('Access Denied');
  }

  try {
    const { id } = req.params;
    const { status } = req.body;

    const allowedStatuses = ['Pending', 'In Progress', 'Resolved'];

    if (!allowedStatuses.includes(status)) {
      return res.status(400).send('Invalid repair status.');
    }

    const [result] = await pool.execute(
      `
            UPDATE bike_repair_reports
            SET status = ?
            WHERE id = ?
            `,
      [status, id]
    );

    if (result.affectedRows === 0) {
      return res.status(404).send('Repair report not found.');
    }

    res.redirect('/repair/admin');
  } catch (error) {
    console.error('Update repair status error:', error);

    res.status(500).send('Unable to update repair status.');
  }
};
