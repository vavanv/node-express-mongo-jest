import express from "express";

import { createUser, getUserByEmail } from "../db/users";
import { generateRandomString, authentication } from "../helpers";
import { AUTH_SESSION_COOKIE } from "../helpers/constants";

export const login = async (req: express.Request, res: express.Response) => {
  try {
    const { email, password } = req.body;
    if (!email || !password) {
      return res.status(400).end();
    }
    const user = await getUserByEmail(email).select(
      "+authentication.salt +authentication.password"
    );
    if (!user) {
      return res.status(400).end();
    }
    const expectedHash = authentication(user.authentication.salt, password);
    if (user.authentication.password !== expectedHash) {
      return res.status(403).end();
    }

    const salt = generateRandomString();
    user.authentication.sessionToken = authentication(
      salt,
      user._id.toString()
    );

    await user.save();

    res.cookie(AUTH_SESSION_COOKIE, user.authentication.sessionToken, {
      domain: "localhost",
      path: "/",
    });

    return res.status(200).json(user).end();
  } catch (err) {
    console.error(err);
    res.status(400).end();
  }
};

export const register = async (req: express.Request, res: express.Response) => {
  try {
    const { email, password, username } = req.body;
    if (!email || !password || !username) {
      return res.status(400).end();
    }

    const existingUser = await getUserByEmail(email);
    if (existingUser) {
      return res.status(400).end();
    }
    const salt = generateRandomString();
    const user = await createUser({
      email,
      username,
      authentication: {
        salt,
        password: authentication(salt, password),
      },
    });
    return res.status(200).json(user).end();
  } catch (err) {
    console.error(err);
    res.status(400).end();
  }
};