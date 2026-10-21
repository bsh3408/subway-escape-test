// 게임 규칙에 쓰는 고정 값. 화면 640×360, 바닥 한 칸 16픽셀
export const TICK_HZ = 30;
export const DT = 1 / TICK_HZ;
export const VIEW_W = 640, VIEW_H = 360;
export const TILE = 16;
export const GRID = 5;                    // 역 하나의 방 격자 5×5
export const CELL_W = 34, CELL_H = 26;    // 격자 한 칸의 크기(타일). 방은 칸 가운데에 놓인다
export const INPUT = { UP: 1, DOWN: 2, LEFT: 4, RIGHT: 8, ATTACK: 16, SKILL: 32, SWAP: 64, ITEM: 128, RUN: 256 };
