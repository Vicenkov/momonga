import Image from "next/image";

export function AssistantAvatar() {
  return (
    <div
      aria-hidden="true"
      className="mt-0.5 h-9 w-9 shrink-0 overflow-hidden rounded-full"
    >
      <Image
        src="/momonga-ribbon.jpg"
        alt=""
        width={36}
        height={36}
        sizes="36px"
        className="h-full w-full object-cover"
      />
    </div>
  );
}