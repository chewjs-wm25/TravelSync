type CreateTripCardProps = {
  variant?: "empty" | "grid";
  onOpen?: () => void;
};

export default function CreateTripCard({
  variant = "grid",
  onOpen,
}: CreateTripCardProps) {
  const sharedClasses =
    "flex cursor-pointer items-center justify-center rounded-2xl border-2 border-dashed border-gray-300 bg-white transition-all hover:border-[#ff6b6b] hover:bg-red-50/20";

  if (variant === "empty") {
    return (
      <button
        type="button"
        onClick={onOpen}
        className={`${sharedClasses} h-48 w-full`}
        aria-haspopup="dialog"
      >
        <span className="text-lg font-semibold text-[#ff6b6b]">
          + Plan A New Trip
        </span>
      </button>
    );
  }

  return (
    <button
      type="button"
      onClick={onOpen}
      className={`${sharedClasses} min-h-[260px] flex-col p-6`}
      aria-haspopup="dialog"
    >
      <span className="text-base font-semibold text-[#ff6b6b]">
        + Plan A New Trip
      </span>
    </button>
  );
}
