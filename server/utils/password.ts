export async function hashPassword(password: string): Promise<string> {
    const hash = await Bun.password.hash(password, {
        algorithm: "bcrypt",
        cost: 10 // number of rounds
    });
    return hash;
}

export async function verifyPassword(password: string, hash: string): Promise<boolean> {
    return Bun.password.verify(password, hash);
}
