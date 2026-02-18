export interface IDatabaseRepository {
  query(text: string, params?: any[]): Promise<any>;
}
