export interface JwtPayload {
  sub: string;
  version?: number;
  email: string;
  role: string;
}
