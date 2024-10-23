export function fft(N: i32, ar: StaticArray<f32>, ai: StaticArray<f32>): void {
  let i: i32, j: i32, k: i32, L: i32;
  let M: i32, TEMP: i32, LE: i32, LE1: i32, ip: i32;
  let NV2: i32, NM1: i32;
  let t: f32;
  let Ur: f32, Ui: f32, Wr: f32, Wi: f32, Tr: f32, Ti: f32;
  let Ur_old: f32;

  NV2 = N >> 1;
  NM1 = N - 1;
  TEMP = N;
  M = 0;
  while (TEMP >>= 1) ++M;

  j = 1;
  for (i = 1; i <= NM1; i++) {
    if (i < j) {
      t = ar[j - 1];
      ar[j - 1] = ar[i - 1];
      ar[i - 1] = t;
      t = ai[j - 1];
      ai[j - 1] = ai[i - 1];
      ai[i - 1] = t;
    }

    k = NV2;
    while (k < j) {
      j -= k;
      k /= 2;
    }

    j += k;
  }

  LE = 1;
  for (L = 1; L <= M; L++) {
    LE1 = LE;
    LE *= 2;
    Ur = 1.0;
    Ui = 0.0;
    Wr = Mathf.cos(Mathf.PI / f32(LE1));
    Wi = -Mathf.sin(Mathf.PI / f32(LE1));
    for (j = 1; j <= LE1; j++) {
      for (i = j; i <= N; i += LE) {
        ip = i + LE1;
        Tr = ar[ip - 1] * Ur - ai[ip - 1] * Ui;
        Ti = ar[ip - 1] * Ui + ai[ip - 1] * Ur;
        ar[ip - 1] = ar[i - 1] - Tr;
        ai[ip - 1] = ai[i - 1] - Ti;
        ar[i - 1] = ar[i - 1] + Tr;
        ai[i - 1] = ai[i - 1] + Ti;
      }
      Ur_old = Ur;
      Ur = Ur_old * Wr - Ui * Wi;
      Ui = Ur_old * Wi + Ui * Wr;
    }
  }
}

// export function computeInverseFFT(input: StaticArray<f32>): void {
//   const N: i32 = input.length / 2;
//   // const output: Float32Array = new Float32Array(N * 2); // Output array will contain real and imaginary parts

//   // Conjugate the input
//   for (let i: i32 = 0; i < input.length; i += 2) {
//     input[i + 1] = -input[i + 1];
//   }

//   // Compute forward FFT
//   computeForwardFFT(input);

//   // Conjugate the output and scale
//   for (let i: i32 = 0; i < input.length; i += 2) {
//     input[i] = input[i] / <f32>N;
//     input[i + 1] = -input[i + 1] / <f32>N;
//   }
// }

// export function computeForwardFFT(input: StaticArray<f32>): void {
//   const N: i32 = input.length / 2;

//   // Bit-reversal permutation
//   let j: i32 = 0;
//   for (let i: i32 = 0; i < N - 1; i++) {
//     if (i < j) {
//       const tempR: f32 = input[i * 2];
//       const tempI: f32 = input[i * 2 + 1];
//       input[i * 2] = input[j * 2];
//       input[i * 2 + 1] = input[j * 2 + 1];
//       input[j * 2] = tempR;
//       input[j * 2 + 1] = tempI;
//     }
//     let k: i32 = N >> 1;
//     while (j >= k) {
//       j -= k;
//       k >>= 1;
//     }
//     j += k;
//   }

//   // Compute FFT
//   let step: i32 = 1;
//   while (step < N) {
//     const angleStep: f32 = Mathf.PI / <f32>step;
//     let k: i32 = 0;
//     while (k < N) {
//       for (let l: i32 = 0; l < step; l++) {
//         const angle: f32 = <f32>l * angleStep;
//         const WkR: f32 = Mathf.cos(angle);
//         const WkI: f32 = Mathf.sin(angle);
//         const i: i32 = k + l;
//         const j: i32 = i + step;

//         const inputR: f32 = input[j * 2];
//         const inputI: f32 = input[j * 2 + 1];

//         const twiddleR: f32 = WkR * inputR - WkI * inputI;
//         const twiddleI: f32 = WkR * inputI + WkI * inputR;

//         const outputR: f32 = input[i * 2];
//         const outputI: f32 = input[i * 2 + 1];

//         input[i * 2] = outputR + twiddleR;
//         input[i * 2 + 1] = outputI + twiddleI;
//         input[j * 2] = outputR - twiddleR;
//         input[j * 2 + 1] = outputI - twiddleI;
//       }
//       k += step * 2;
//     }
//     step <<= 1;
//   }
// }

// export function reconstructWave(input: StaticArray<f32>): void {
//   const N: i32 = input.length / 2;

//   // Extract the real part and normalize
//   for (let i: i32 = 0; i < N; i++) {
//     input[i] = input[i * 2] / <f32>N;
//   }
// }
