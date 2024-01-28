export interface AuthService {
	performAuthorization(options: {silent: boolean}): Promise<void>;
    receiveAuthFlow(parameters: any): void;
}
