"use strict";

/** @type {import('sequelize-cli').Migration} */
const bcrypt = require("bcrypt");

module.exports = {
  up: async (queryInterface, Sequelize) => {
    const saltRounds = 10;
    const plainPasswords = ["vivekpassword", "pupilfirst", "testadmin"]; // Store the plain passwords in an array
    const hashedPasswords = await Promise.all(
      // Hash all the passwords using bcrypt
      plainPasswords.map((password) => bcrypt.hash(password, saltRounds))
    );
    const users = [
      {
        name: "vivek",
        email: "vivek@gmail.com",
        password: hashedPasswords[0],
        role: "admin",
        createdAt: new Date(),
        updatedAt: new Date(),
      },
      {
        name: "wdcoach",
        email: "wdcoach@gmail.com",
        password: hashedPasswords[1],
        role: "admin",
        createdAt: new Date(),
        updatedAt: new Date(),
      },
      {
        name: "testadmin",
        email: "testadmin@gmail.com",
        password: hashedPasswords[2],
        role: "admin",
        createdAt: new Date(),
        updatedAt: new Date(),
      },
    ];
    return await queryInterface.bulkInsert("Users", users);
  },

  down: async (queryInterface, Sequelize) => {
    await queryInterface.bulkDelete("Users", null, {});
  },
};

 
