export interface StoredUser {
  id: string;
  email: string;
  passwordHash: string;
  createdAt: string; // ISO-8601
}

export interface UserRepository {
  findByEmail(email: string): Promise<StoredUser | null>;
  findById(id: string): Promise<StoredUser | null>;
  save(user: StoredUser): Promise<void>;
}
