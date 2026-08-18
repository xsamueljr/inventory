import type { ValueObject } from "./value-object";

export type Password = ValueObject<string>;
export type HashedPassword = ValueObject<string>;
export type AuthToken = ValueObject<string>;

export interface PasswordHasher {
  hash(plain: Password): Promise<HashedPassword>;
  compare(plain: Password, hashed: HashedPassword): Promise<boolean>;
}

export interface EmailService {
  send(email: Email): Promise<void>;
}

export type Email = {
  subject: string;
  body: string;
};

export interface TokenManager {
  generateToken(payload: { userId: string }): AuthToken;
  verifyToken(token: string): string | null;
}
