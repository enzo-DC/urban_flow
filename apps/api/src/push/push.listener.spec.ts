import { BadgeDebloqueEvent } from '../gamification/events/badge-debloque.event';
import { PushListener } from './push.listener';
import type { PushService } from './push.service';

function buildPushService(): PushService {
  return {
    envoyerATous: jest.fn().mockResolvedValue(undefined),
  } as unknown as PushService;
}

describe('PushListener', () => {
  it("envoie une notification a l'utilisateur avec un message specifique au palier", async () => {
    const push = buildPushService();
    const listener = new PushListener(push);
    const event = new BadgeDebloqueEvent('user-1', 'bronze');

    await listener.handleBadgeDebloque(event);

    // eslint-disable-next-line @typescript-eslint/unbound-method -- jest.fn() mock.
    expect(push.envoyerATous).toHaveBeenCalledWith('user-1', {
      titre: 'Nouveau badge débloqué !',
      corps: 'Tu as débloqué le badge Bronze !',
    });
  });

  it("ne jette jamais si l'envoi echoue (degradation gracieuse)", async () => {
    const push = buildPushService();
    (push.envoyerATous as jest.Mock).mockRejectedValue(new Error('down'));
    const listener = new PushListener(push);
    const event = new BadgeDebloqueEvent('user-1', 'or');

    await expect(listener.handleBadgeDebloque(event)).resolves.toBeUndefined();
  });
});
