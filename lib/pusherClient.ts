import Pusher from "pusher-js";

let pusher: Pusher | null = null;

export const getPusherClient = () => {
  if (pusher) return pusher;
  pusher = new Pusher(process.env.NEXT_PUBLIC_PUSHER_KEY!, {
    cluster: process.env.NEXT_PUBLIC_PUSHER_CLUSTER!,
    channelAuthorization: {
      endpoint: "/api/pusher/auth",
      transport: "ajax",
    },
  });
  return pusher;
};
