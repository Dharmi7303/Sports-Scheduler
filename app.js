/* eslint-disable no-unused-vars */
/* eslint-disable no-undef */

const bodyParser = require("body-parser");
const path = require("path");
const moment = require("moment-timezone");

const flash = require("connect-flash");
const passport = require("passport");
const LocalStrategy = require("passport-local");
// var csrf = require("tiny-csrf");
const cookieParser = require("cookie-parser");
const connectEnsureLogin = require("connect-ensure-login");
const bcrypt = require("bcrypt");
const { User, Sport, Session, SessionPlayer } = require("./models");
const sequelize = require("sequelize");
const express = require("express");
const session = require("express-session");
const { Op } = sequelize;

const app = express();

app.use(express.urlencoded({ extended: false }));
app.use(bodyParser.json());
app.use(cookieParser("Complete WD201 DSA and Assignments"));
//app.use(csrf("123453747imamsecret987654321book", ["POST", "PUT", "DELETE"]));

app.use(
  session({
    secret: "ho-doper-secret-api-1248512542345",

    resave: false,
    saveUninitialized: false,

    cookie: {
      maxAge: 24 * 60 * 60 * 1000, //24hrs
    },
  })
);

app.use(passport.initialize());
app.use(passport.session());

passport.use(
  new LocalStrategy(
    {
      usernameField: "email",
      passwordField: "password",
    },
    async (username, password, done) => {
      try {
        const user = await User.findOne({ where: { email: username } });
        if (!user) {
          return done(null, false, { message: " Sign Up! " });
        }
        const result = await bcrypt.compare(password, user.password);
        if (result) {
          return done(null, user);
        } else {
          return done(null, false, { message: "Invalid password" });
        }
      } catch (err) {
        console.log(err);
        return done(null, false, { message: "Invalid Email" });
      }
    }
  )
);

passport.serializeUser((user, done) => {
  done(null, user.id);
});

passport.deserializeUser(async (id, done) => {
  try {
    const user = await User.findByPk(id);
    done(null, user);
  } catch (err) {
    done(err, null);
  }
});

function requireAdmin(req, res, next) {
  if (req.user && req.user.role === "admin") {
    return next();
  } else {
    res.status(401).json({ message: "Unauthorized user." });
  }
}

app.use(flash());

app.use((req, res, next) => {
  res.locals.messages = req.flash();
  next();
});

app.set("view engine", "ejs");
app.use(express.static(path.join(__dirname, "public")));

// Define your routes here

app.get("/signup", async (req, res) => {
  res.render("signup" );
});

app.get("/", async (req, res) => {
  res.render("index" );
});

app.get("/login", async (req, res) => {
  res.render("login" );
});

app.get("/signout", connectEnsureLogin.ensureLoggedIn(), (req, res, next) => {
  req.logout((err) => {
    if (err) {
      return next(err);
    }
    res.redirect("/");
  });
});

app.get("/sport/new", requireAdmin, async (req, res) => {
  res.render("newsport" );
});

app.post("/createsport", requireAdmin, async (req, res) => {
  await Sport.addSport(req.body.sportname);

  res.redirect("/home");
});

app.get("/home", connectEnsureLogin.ensureLoggedIn(), async (req, res) => {
  const sports = await Sport.getSports();

  const currentDate = new Date();
  currentDate.setHours(currentDate.getHours() + 1);
  currentDate.setMinutes(currentDate.getMinutes());

  let sesjoined = await SessionPlayer.findAll({
    where: {
      userId: req.user.id,
    },
    order: [["id", "ASC"]],
  });

  let sessionIds = sesjoined.map((session) => session.sessionId);

  let joinedUpcoming = await Session.findAll({
    where: {
      id: {
        [Op.in]: sessionIds,
      },

      when: {
        [Op.gt]: currentDate,
      },
    },
    order: [["when", "ASC"]],
    include: [
      {
        model: Sport,
        attributes: ["sportname"],
        required: true,
      },
    ],
  });

  const isAdmin = req.user.role === "admin";
  res.render("home", {
    name: req.user.name,
    sports,
    admin: isAdmin,
    joinedUpcoming,
    
  });
});

app.get(
  "/changepassword",
  connectEnsureLogin.ensureLoggedIn(),
  async (req, res) => {
  
      res.render("changepassword" );
    }
   
);

app.post('/passwordchange', connectEnsureLogin.ensureLoggedIn(), async (req, res) => {
  if (req.user.role === "admin") {
    req.flash("error", "Admin cannot change password");
    return res.redirect(`/changepassword`);
  } else {
    const user = await User.findByPk(req.user.id);
    const result = await bcrypt.compare(req.body.oldpassword, user.password);
    if (result) {
      const hashedPassword = await bcrypt.hash(req.body.newpassword, 10);
      await User.update(
        { password: hashedPassword },
        {
          where: {
            id: req.user.id,
          },
        }
      );
      req.flash("success", "Password changed successfully");
      return res.redirect(`/home`);
    } else {
      req.flash("error", "Invalid old password");
      return res.redirect(`/chagepassword`);
    }
  }

});





app.get("/sport/:id", connectEnsureLogin.ensureLoggedIn(), async (req, res) => {
  const id = req.params.id;
  const sport = await Sport.getSportWithID(id);
  let adminboolean = (await req.user.role) === "admin";

  const currentDate = new Date();
  currentDate.setHours(currentDate.getHours() + 1);
  currentDate.setMinutes(currentDate.getMinutes());

  let gameSession = await Session.findAll({
    where: {
      sportId: id,
      isCanceled: false,
      when: {
        [Op.gt]: currentDate,
      },
    },
    order: [["when", "ASC"]],
  });

  let pastSession = await Session.findAll({
    where: {
      sportId: id,
      isCanceled: false,
      when: {
        [Op.lt]: currentDate,
      },
    },
    order: [["when", "DESC"]],
  });

  res.render("sportpage", {
    admin: adminboolean,
    sport,
    gameSession,
    pastSession,
    
  });
});

app.put("/sport/:id", requireAdmin, async (req, res) => {
  await Sport.update(
    { sportname: req.body.sportname },
    { where: { id: req.params.id } }
  );
  res.redirect(`/sport/${req.params.id}`);
});

app.delete("/sport/:id", requireAdmin, async (req, res) => {
  try {
    await Sport.destroy({ where: { id: req.params.id } });
    res.redirect("/home");
  } catch (error) {
    console.error(error);
    res.redirect("/home");
  }
});

app.get("/adminreport", requireAdmin, async (req, res) => {
  res.render("report", { bol: false });
});

app.post("/adminreport", requireAdmin, async (req, res) => {
  let startdate = req.body.startdate;
  let enddate = req.body.enddate;

  let sessionsPlayed = await Session.findAll({
    where: {
      when: {
        [Op.gte]: startdate,
        [Op.lte]: enddate,
      },
      isCanceled: false,
    },
    include: [
      {
        model: Sport,
        attributes: ["sportname"],
        required: true,
      },
    ],
    order: [["when", "ASC"]],
  });

  const sessions = await Session.findAll({
    where: {
      when: {
        [Op.between]: [startdate, enddate],
      },
    },
    include: [{ model: Sport }],
  });

  const sports = {};
  sessions.forEach((session) => {
    const sportName = session.Sport.sportname;
    if (sports[sportName]) {
      sports[sportName]++;
    } else {
      sports[sportName] = 1;
    }
  });

  console.log(sports);

  res.render("report", { sessionsPlayed, sports, bol: true });
});

app.post("/users", async (req, res) => {
  const hasedPwd = await bcrypt.hash(req.body.password, 10);

  await User.create({
    name: req.body.name,
    email: req.body.email,
    password: hasedPwd,
    role: "player",
  });

  res.redirect("/login");
});

function formatDateToDB(dateInput) {
  const date = new Date(dateInput);
  const formattedDate =
    date.getFullYear() +
    "-" +
    ("0" + (date.getMonth() + 1)).slice(-2) +
    "-" +
    ("0" + date.getDate()).slice(-2) +
    " " +
    ("0" + date.getHours()).slice(-2) +
    ":" +
    ("0" + date.getMinutes()).slice(-2) +
    ":" +
    ("0" + date.getSeconds()).slice(-2) +
    "." +
    ("00" + date.getMilliseconds()).slice(-3) +
    "+05:30";

  return formattedDate;
}

function formatTimestamp(timestamp) {
  const date = moment.tz(timestamp, "Asia/Kolkata");
  const formattedDate = date.format("DD/MM/YYYY HH:mm");

  return formattedDate;
}

app.delete(
  "/delete-player",
  connectEnsureLogin.ensureLoggedIn(),
  async (req, res) => {
    try {
      await Session.update(
        { count: sequelize.literal("count + 1") },
        { where: { id: req.body.sessionId } }
      );

      await SessionPlayer.destroy({
        where: {
          id: req.body.id,
        },
      });
      res.send("ok");
    } catch (error) {
      console.error(error);
      res.status(500).send("Internal Server Error");
    }
  }
);

app.get(
  "/cancelsessionpage/:sid",
  connectEnsureLogin.ensureLoggedIn(),
  async (req, res) => {
    res.render("cancelsession", { sid: req.params.sid });
  }
);

app.post(
  "/cancelsession/:sid",
  connectEnsureLogin.ensureLoggedIn(),
  async (req, res) => {
    let reason = req.body.reason;

    let sid = req.params.sid;

    let spid = await Session.findByPk(sid);

    spid = spid.sportId;

    await Session.update(
      { isCanceled: true, reason: reason },
      {
        where: {
          id: sid,
        },
      }
    );

    res.redirect(`/sport/${spid}`);
  }
);

app.post(
  "/editsportsession/:id",
  connectEnsureLogin.ensureLoggedIn(),
  async (req, res) => {
    try {
      const id = req.params.id;
      let sessionNow = await Session.findByPk(id);

      const enteredDate = new Date(req.body.when);
      const today = new Date();
      if (enteredDate < today) {
        req.flash("error", "past date");
        return res.redirect(`/edit-session/${id}`);
      }

      const when = formatDateToDB(req.body.when);
      const count = req.body.count;
      const venue = req.body.venue;

      await sessionNow.update({
        when: when,
        count: count,
        venue: venue,
      });

      res.redirect(`/sessionpage/${id}`);
    } catch (error) {
      console.error(error);
      res.status(500).send("An error occurred while updating the session.");
    }
  }
);

app.post(
  "/sportsession/:id",
  connectEnsureLogin.ensureLoggedIn(),
  async (req, res) => {
    const id = req.params.id;
    const creatorID = req.user.id;

    const enteredDate = new Date(req.body.when);
    const today = new Date();
    if (enteredDate < today) {
      req.flash("error", "past date");
      return res.redirect(`/sessioncreate/${id}`);
    }

    let when = formatDateToDB(req.body.when);
    const { venue, requiredteammembers } = req.body;

    const sessionDetails = await Session.create({
      sportId: id,
      creatorID,
      venue,
      when: when,
      count: requiredteammembers,
    });

    let players = req.body.players;

    const names = players
      .split(",")
      .map((name) => name.trim())
      .filter(Boolean);

    await SessionPlayer.create({
      playername: req.user.name,
      sessionId: sessionDetails.id,
      userId: req.user.id,
    });

    await Promise.all([
      SessionPlayer.create({
        playername: names[0],
        sessionId: sessionDetails.id,
      }),
      ...names.slice(1).map((name) =>
        SessionPlayer.create({
          playername: name,
          sessionId: sessionDetails.id,
        })
      ),
    ]);

    const sesplayers = await SessionPlayer.findAll({
      where: { sessionId: sessionDetails.id },
    });
    const sport = await Sport.findByPk(id);

    res.redirect(`/sessionpage/${sessionDetails.id}`);
  }
);

app.post(
  "/join-session",
  connectEnsureLogin.ensureLoggedIn(),
  async (req, res) => {
    await Session.update(
      { count: sequelize.literal("count - 1") },
      { where: { id: req.body.sessionId } }
    );

    await SessionPlayer.create({
      sessionId: req.body.sessionId,
      playername: req.user.name,
      userId: req.user.id,
    });

    res.send("hi");
  }
);

// app.get("/sportsession",connectEnsureLogin.ensureLoggedIn(), async (req, res) => {
//   res.render()
// });

app.delete(
  "/leave-session",
  connectEnsureLogin.ensureLoggedIn(),
  async (req, res) => {
    const sid = req.body.sessionId;

    await Session.update(
      { count: sequelize.literal("count + 1") },
      { where: { id: req.body.sessionId } }
    );

    await SessionPlayer.destroy({
      where: {
        userId: req.user.id,
        sessionId: sid,
      },
    });

    res.send("hi");
  }
);

app.get(
  "/sessionpage/:id",
  connectEnsureLogin.ensureLoggedIn(),
  async (req, res) => {
    const userId = req.user.id;

    const id = req.params.id;

    const sessionDetails = await Session.findByPk(id);
    const sport = await Sport.findByPk(sessionDetails.sportId);
    const sesplayers = await SessionPlayer.findAll({
      where: { sessionId: sessionDetails.id },
    });
    const joined = Boolean(
      await SessionPlayer.findOne({
        where: { userId, sessionId: sessionDetails.id },
      })
    );

    const currentDate = new Date();
    currentDate.setHours(currentDate.getHours() + 1);
    currentDate.setMinutes(currentDate.getMinutes());

    let previouSession = sessionDetails.when < currentDate;

    console.log(previouSession);

    console.log(sessionDetails.when);

    console.log(formatDateToDB(currentDate));

    res.render("session", {
      sport: sport.sportname,
      sessionId: sessionDetails.id,
      date: formatTimestamp(sessionDetails.when),
      venue: sessionDetails.venue,
      count: sessionDetails.count,
      organizer: userId === sessionDetails.creatorID,
      players: sesplayers,
      joined,
      sessionDetails: sessionDetails,
      previouSession,
    });
  }
);

app.get(
  "/edit-session/:id",
  connectEnsureLogin.ensureLoggedIn(),
  async (req, res) => {
    let useridtoverify = req.user.id;
    let sessionnow = await Session.findByPk(req.params.id);
    if (useridtoverify === sessionnow.creatorID) {
      let whenDate = new Date(sessionnow.when);
      whenDate.setHours(whenDate.getHours() + 5);
      whenDate.setMinutes(whenDate.getMinutes() + 30);

      res.render("editsession", {
        count: sessionnow.count,
        venue: sessionnow.venue,
        when: whenDate
          .toISOString()
          .replace(/\.\d{3}Z$/, "")
          .replace("T", " "),
        id: sessionnow.id,
      });
    } else {
      res.send("Invalid");
    }
  }
);

app.get(
  "/sessioncreate/:id",
  connectEnsureLogin.ensureLoggedIn(),
  async (req, res) => {
    res.render("newsession", { id: req.params.id });
  }
);

app.post(
  "/session",
  passport.authenticate("local", {
    failureRedirect: "/login",
    failureFlash: true,
  }),
  (req, res) => res.redirect("/home")
);

module.exports = app;
