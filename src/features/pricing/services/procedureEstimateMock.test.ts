import { estimateProcedureMock } from './procedureEstimateMock';

describe('procedureEstimateMock', () => {
  const ID_TOKEN = 'mock-id-token';

  it('calculates hours cost from duration and fixed hourly rate (R$ 120,00)', async () => {
    const response = await estimateProcedureMock(ID_TOKEN, {
      durationMinutes: 60,
    });

    expect(response.hourlyRateUsed).toBe('120.00');
    expect(response.hoursCost).toBe('120.00');
    expect(response.tripCost).toBe('0.00');
    expect(response.tripEstimateAvailable).toBe(false);
    expect(response.suppliesCost).toBe('0.00');
    expect(response.minimumPrice).toBe('120.00');
  });

  it('calculates 90 minutes proportionally (1.5h * 120 = 180)', async () => {
    const response = await estimateProcedureMock(ID_TOKEN, {
      durationMinutes: 90,
    });

    expect(response.hoursCost).toBe('180.00');
    expect(response.minimumPrice).toBe('180.00');
  });

  it('includes deterministic trip cost when clientId ends with even charCode', async () => {
    // '0' has char code 48 (even)
    const response = await estimateProcedureMock(ID_TOKEN, {
      durationMinutes: 60,
      clientId: 'client-uuid-0',
    });

    expect(response.tripEstimateAvailable).toBe(true);
    expect(response.tripCost).toBe('45.00');
    expect(response.tripEstimateDays).toBe(3);
    expect(response.minimumPrice).toBe('165.00'); // 120 + 45
  });

  it('sets tripCost to 0 and tripEstimateAvailable to false when clientId ends with odd charCode', async () => {
    // '1' has char code 49 (odd)
    const response = await estimateProcedureMock(ID_TOKEN, {
      durationMinutes: 60,
      clientId: 'client-uuid-1',
    });

    expect(response.tripEstimateAvailable).toBe(false);
    expect(response.tripCost).toBe('0.00');
    expect(response.tripEstimateDays).toBe(0);
    expect(response.minimumPrice).toBe('120.00');
  });

  it('includes supplies cost based on item quantity', async () => {
    const response = await estimateProcedureMock(ID_TOKEN, {
      durationMinutes: 60,
      supplies: [
        { itemId: 'item-1', quantity: 2 },
        { itemId: 'item-2', quantity: 1 },
      ],
    });

    // 3 items * R$ 25,00 = R$ 75,00
    expect(response.suppliesCost).toBe('75.00');
    expect(response.minimumPrice).toBe('195.00'); // 120 + 75
  });

  it('sums all 3 parts correctly (hours + trip + supplies)', async () => {
    const response = await estimateProcedureMock(ID_TOKEN, {
      durationMinutes: 90, // 180
      clientId: 'client-uuid-0', // 45
      supplies: [{ itemId: 'item-1', quantity: 2 }], // 50
    });

    expect(response.hoursCost).toBe('180.00');
    expect(response.tripCost).toBe('45.00');
    expect(response.suppliesCost).toBe('50.00');
    expect(response.minimumPrice).toBe('275.00'); // 180 + 45 + 50
  });
});
