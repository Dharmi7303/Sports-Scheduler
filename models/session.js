'use strict';
const { Model } = require("sequelize");

module.exports = (sequelize, DataTypes) => {
  class Session extends Model {
    static associate(models) {
      Session.belongsTo(models.Sport, { foreignKey: "sportId" });
      Session.belongsTo(models.User, { foreignKey: "creatorID" });
      Session.hasMany(models.SessionPlayer, { foreignKey: "sessionId" });
    }
  }

  Session.init(
    {
      sportId: DataTypes.INTEGER,
      creatorID: DataTypes.INTEGER,
      venue: DataTypes.STRING,
      when: DataTypes.DATE,
      count: DataTypes.INTEGER,
      isCanceled: DataTypes.BOOLEAN,
      reason: DataTypes.STRING,
    },
    {
      sequelize,
      modelName: "Session",
    }
  );

  return Session;
};
