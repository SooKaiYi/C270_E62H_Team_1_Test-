const { readJson, writeJson } = require("./jsonFileModel");
const { InsufficientBalanceError } = require("./walletModel");

let rentalWriteQueue = Promise.resolve();

function runRentalWrite(task) {
    rentalWriteQueue = rentalWriteQueue.then(task, task);
    return rentalWriteQueue;
}


// =======================================
// Get All Rentals
// =======================================

async function getAllRentals() {

    return await readJson("rentals.json");

}


// =======================================
// Create Rental ID
// =======================================

function getNextRentalId(rentals) {

    return rentals.reduce((highest, rental) => {

        return Math.max(
            highest,
            Number(rental.id || 0)
        );

    }, 0) + 1;

}


// =======================================
// Rent Bike
// =======================================

async function rentBike(user) {

    return runRentalWrite(async () => {


        const rentals = await readJson("rentals.json");
        const bikes = await readJson("bikes.json");
        const wallets = await readJson("wallets.json");
        const transactions = await readJson("wallet_transactions.json");


        const bike = bikes.find(
            b => b.id === Number(user.bikeId)
        );


        if (!bike) {

            throw new Error("Bike not found.");

        }


        if (bike.status === "Rented") {

            throw new Error(
                "This bike has already been rented."
            );

        }


        const wallet = wallets.find(
            w => w.userId === Number(user.userId)
        );


        if (!wallet) {

            throw new Error("Wallet not found.");

        }


        // Support old wallet records
        wallet.tripCredits = wallet.tripCredits || 0;
        wallet.dayPassCredits = wallet.dayPassCredits || 0;


        const bikePrice = Number(bike.price);

        let paymentMethod;
        let chargedAmount = bikePrice;



        // =======================================
        // Payment Priority
        // =======================================


        // Day Pass = 10 free rentals
        if (wallet.dayPassCredits > 0) {


            wallet.dayPassCredits--;

            paymentMethod = "Day Pass";

            chargedAmount = 0;


        }


        // 2 Way Trip = 2 free rentals
        else if (wallet.tripCredits > 0) {


            wallet.tripCredits--;

            paymentMethod = "2 Way Trip";

            chargedAmount = 0;


        }


        // Normal wallet payment
        else if (Number(wallet.balance) >= bikePrice) {


            wallet.balance = Number(
                (
                    Number(wallet.balance) - bikePrice
                ).toFixed(2)
            );


            paymentMethod = "Wallet";


        }


        // Not enough money
        else {


            const error = new InsufficientBalanceError(
                "Insufficient wallet balance. Please top up credits first."
            );


            error.balance = wallet.balance;

            error.required = bikePrice;


            throw error;


        }



        // =======================================
        // Create Rental Record
        // =======================================


        bike.status = "Rented";


        const rental = {


            id: getNextRentalId(rentals),


            userId: Number(user.userId),


            userName: user.userName,


            bikeId: bike.id,


            bikeName: bike.name,


            amount: chargedAmount,


            paymentMethod: paymentMethod,


            status: "Active",


            rentedAt: new Date().toISOString(),


            returnedAt: null


        };


        rentals.push(rental);




        // =======================================
        // Create Transaction
        // =======================================


        const nextTransactionId = transactions.reduce(

            (highest, transaction) => {

                return Math.max(
                    highest,
                    Number(transaction.transactionId || 0)
                );

            },

            0

        ) + 1;



        transactions.push({


            transactionId: nextTransactionId,


            userId: Number(user.userId),


            type: paymentMethod + " - Bike Rental",


            amount: chargedAmount,


            balanceAfter: wallet.balance,


            status: "Success",


            timestamp: new Date().toISOString()


        });





        // =======================================
        // Save Files
        // =======================================


        await writeJson(
            "wallets.json",
            wallets
        );


        await writeJson(
            "wallet_transactions.json",
            transactions
        );


        await writeJson(
            "bikes.json",
            bikes
        );


        await writeJson(
            "rentals.json",
            rentals
        );



        return rental;


    });

}



// =======================================
// Return Bike
// =======================================

async function returnBike(rentalId) {


    return runRentalWrite(async () => {


        const rentals = await readJson("rentals.json");

        const bikes = await readJson("bikes.json");



        const rental = rentals.find(
            r => r.id === Number(rentalId)
        );


        if (!rental) {

            throw new Error("Rental not found.");

        }



        const bike = bikes.find(
            b => b.id === rental.bikeId
        );



        if (bike) {

            bike.status = "Available";

        }



        rental.status = "Returned";


        rental.returnedAt =
            new Date().toISOString();




        await writeJson(
            "bikes.json",
            bikes
        );


        await writeJson(
            "rentals.json",
            rentals
        );



        return rental;


    });


}



// =======================================
// Get Rentals By User
// =======================================

async function getUserRentals(userId) {


    const rentals = await readJson(
        "rentals.json"
    );


    return rentals

        .filter(
            r => r.userId === Number(userId)
        )

        .sort(
            (a, b) =>
                new Date(b.rentedAt) -
                new Date(a.rentedAt)
        );


}



// =======================================
// Update Rental
// =======================================

async function updateRental(rentalId, updatedData) {


    return runRentalWrite(async () => {


        const rentals = await readJson(
            "rentals.json"
        );


        const rental = rentals.find(
            r => r.id === Number(rentalId)
        );


        if (!rental) {

            throw new Error("Rental not found.");

        }



        rental.status =
            updatedData.status ||
            rental.status;



        if (updatedData.returnedAt) {

            rental.returnedAt =
                updatedData.returnedAt;

        }



        await writeJson(
            "rentals.json",
            rentals
        );


        return rental;


    });


}



// =======================================
// Delete Rental
// =======================================

async function deleteRental(rentalId) {


    return runRentalWrite(async () => {


        const rentals = await readJson(
            "rentals.json"
        );


        const bikes = await readJson(
            "bikes.json"
        );



        const rental = rentals.find(
            r => r.id === Number(rentalId)
        );



        if (!rental) {

            throw new Error("Rental not found.");

        }



        const bike = bikes.find(
            b => b.id === rental.bikeId
        );



        if (bike) {

            bike.status = "Available";


            await writeJson(
                "bikes.json",
                bikes
            );

        }



        const updatedRentals =
            rentals.filter(
                r => r.id !== Number(rentalId)
            );



        await writeJson(
            "rentals.json",
            updatedRentals
        );



        return true;


    });


}



module.exports = {

    getAllRentals,

    getUserRentals,

    rentBike,

    returnBike,

    updateRental,

    deleteRental

};