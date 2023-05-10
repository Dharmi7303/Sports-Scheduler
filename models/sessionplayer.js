'use strict';
const { Model } = require('sequelize');

module.exports = (sequelize, DataTypes) => {
  class SessionPlayer extends Model {
    static associate(models) {
      SessionPlayer.belongsTo(models.Session, { foreignKey: "sessionId" });
      SessionPlayer.belongsTo(models.User, { foreignKey: "userId" });
    }
  }

  SessionPlayer.init({
    sessionId: DataTypes.INTEGER,
    playername: DataTypes.STRING,
    userId: DataTypes.INTEGER
  }, {
    sequelize,
    modelName: 'SessionPlayer',
  });

  return SessionPlayer;
};
