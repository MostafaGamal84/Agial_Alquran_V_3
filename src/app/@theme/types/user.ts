import { UserTypesEnum } from './UserTypesEnum';

export class User {
  serviceToken!: string;
  refreshToken?: string;
  user!: {
    firstName?: string;
    lastName?: string;
    id: string;
    email: string;
    password: string;
    name: string;
    role: UserTypesEnum;
  };
}
