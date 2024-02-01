export const generateTimer = (min: number, max: number): number => {
    const numSal = Math.random();
    const numeroAleatorio = Math.floor(numSal * (max - min + 1)) + min;
    return numeroAleatorio;
}