import "next-auth";

/**
 * This module augmentation tells TypeScript what our User and Session objects
 * look like. We are adding the 'id' property from our database to the
 * default session.user object.
 */
declare module "next-auth" {
  /**
   * Returned by `useSession`, `getSession` and received as a prop on the `SessionProvider` React Context
   */
  interface Session {
    user: {
      /** The user's database id. */
      id: string;
    } & DefaultSession["user"]; // This keeps the default properties (name, email, image)
  }

  /**
   * The shape of the user object returned in the JWT and database.
   */
  interface User {
    id: string;
  }
}
