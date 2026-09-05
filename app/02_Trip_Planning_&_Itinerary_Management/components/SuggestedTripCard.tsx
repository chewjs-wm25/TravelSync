export type SuggestedTripCardProps = {
  name: string;
  image: string;
  description: string;
  owner: {
    username: string;
    avatar: string;
  };
};

export default function SuggestedTripCard({
  name,
  image,
  description,
  owner,
}: SuggestedTripCardProps) {
  return (
    <div className="flex flex-col overflow-hidden rounded-2xl border border-gray-100 bg-white shadow-sm">
      <div className="h-44 w-full bg-gray-200">
        <img src={image} alt={name} className="h-full w-full object-cover" />
      </div>

      <div className="flex flex-1 flex-col justify-between p-4">
        <div>
          <h3 className="font-semibold text-gray-800">{name}</h3>
          <p className="mt-2 text-xs leading-relaxed text-gray-500">
            {description}
          </p>
        </div>

        <div className="mt-4 flex items-center gap-3 border-t border-gray-100 pt-3">
          <img
            src={owner.avatar}
            alt={owner.username}
            className="h-8 w-8 rounded-full object-cover"
          />
          <span className="text-xs font-medium text-gray-700">
            {owner.username}
          </span>
        </div>
      </div>
    </div>
  );
}
