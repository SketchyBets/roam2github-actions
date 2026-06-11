import { NextAuthOptions } from 'next-auth';
import CredentialsProvider from 'next-auth/providers/credentials';
import bcrypt from 'bcryptjs';

export const authOptions: NextAuthOptions = {
  providers: [
    CredentialsProvider({
      name: 'credentials',
      credentials: {
        email: { label: 'Email', type: 'email' },
        password: { label: 'Password', type: 'password' },
      },
      async authorize(credentials) {
        if (!credentials?.email || !credentials?.password) return null;

        const validEmail = process.env.APP_USER_EMAIL;
        const validPasswordHash = process.env.APP_USER_PASSWORD;

        if (!validEmail || !validPasswordHash) {
          console.error('APP_USER_EMAIL or APP_USER_PASSWORD not set');
          return null;
        }

        if (credentials.email !== validEmail) return null;

        const isValid = await bcrypt.compare(credentials.password, validPasswordHash);
        if (!isValid) return null;

        return { id: '1', email: validEmail, name: 'Banker' };
      },
    }),
  ],
  pages: {
    signIn: '/login',
  },
  session: {
    strategy: 'jwt',
    maxAge: 7 * 24 * 60 * 60,
  },
  callbacks: {
    async jwt({ token, user }) {
      if (user) token.user = user;
      return token;
    },
    async session({ session, token }) {
      session.user = token.user as typeof session.user;
      return session;
    },
  },
};
