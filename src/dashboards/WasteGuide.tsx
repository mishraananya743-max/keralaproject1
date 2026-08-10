import { Card, Badge } from '@/components/ui';
import { Recycle, Leaf, FlaskConical, Trash2, Apple, Newspaper, Battery, Lightbulb, Package, Droplet } from 'lucide-react';

const categories = [
  {
    type: 'Organic / Wet Waste',
    color: 'green',
    icon: Leaf,
    bgClass: 'bg-green-50',
    borderClass: 'border-green-200',
    iconClass: 'text-green-600',
    items: [
      { icon: Apple, label: 'Food scraps' },
      { icon: Leaf, label: 'Garden waste' },
      { icon: Droplet, label: 'Tea leaves / coffee grounds' },
      { icon: Apple, label: 'Fruit peels & seeds' },
    ],
    process: 'Composted at local facilities to produce organic fertilizer for agriculture',
    binColor: 'Green bin',
  },
  {
    type: 'Recyclable / Dry Waste',
    color: 'blue',
    icon: Recycle,
    bgClass: 'bg-blue-50',
    borderClass: 'border-blue-200',
    iconClass: 'text-blue-600',
    items: [
      { icon: Newspaper, label: 'Paper & cardboard' },
      { icon: Package, label: 'Plastic bottles & containers' },
      { icon: Recycle, label: 'Glass & metal' },
      { icon: Package, label: 'Clean packaging' },
    ],
    process: 'Sorted and sent to recycling plants for reprocessing into new products',
    binColor: 'Blue bin',
  },
  {
    type: 'Hazardous Waste',
    color: 'red',
    icon: FlaskConical,
    bgClass: 'bg-red-50',
    borderClass: 'border-red-200',
    iconClass: 'text-red-600',
    items: [
      { icon: Battery, label: 'Batteries & e-waste' },
      { icon: FlaskConical, label: 'Chemicals & paints' },
      { icon: Lightbulb, label: 'Broken glass / bulbs' },
      { icon: Battery, label: 'Medical waste' },
    ],
    process: 'Specially handled and disposed at authorized hazardous waste treatment facilities',
    binColor: 'Red bin',
  },
  {
    type: 'General Waste',
    color: 'gray',
    icon: Trash2,
    bgClass: 'bg-gray-50',
    borderClass: 'border-gray-200',
    iconClass: 'text-gray-600',
    items: [
      { icon: Trash2, label: 'Soiled paper' },
      { icon: Package, label: 'Used tissues' },
      { icon: Trash2, label: 'Ceramic pieces' },
      { icon: Trash2, label: 'Non-recyclable items' },
    ],
    process: 'Sent to sanitary landfills for safe disposal',
    binColor: 'Black/Grey bin',
  },
];

export function WasteGuide() {
  return (
    <div className="space-y-6">
      <div className="text-center">
        <h2 className="text-xl font-bold text-gray-800">Waste Segregation Guide</h2>
        <p className="text-sm text-gray-500 mt-1">Segregate waste at source for a cleaner Kerala</p>
      </div>

      {/* Color bins visual */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {categories.map((cat) => {
          const Icon = cat.icon;
          return (
            <div key={cat.type} className={`p-4 rounded-xl border-2 ${cat.borderClass} ${cat.bgClass} text-center`}>
              <div className={`inline-flex p-3 rounded-full ${cat.bgClass} mb-2`}>
                <Icon className={`w-8 h-8 ${cat.iconClass}`} />
              </div>
              <p className="text-sm font-semibold text-gray-800">{cat.binColor}</p>
              <p className="text-xs text-gray-500 mt-1">{cat.type}</p>
            </div>
          );
        })}
      </div>

      {/* Detailed cards */}
      {categories.map((cat) => {
        const Icon = cat.icon;
        return (
          <Card key={cat.type} className="p-5">
            <div className="flex items-center gap-3 mb-4">
              <div className={`p-3 rounded-lg ${cat.bgClass}`}>
                <Icon className={`w-6 h-6 ${cat.iconClass}`} />
              </div>
              <div>
                <h3 className="font-bold text-gray-800">{cat.type}</h3>
                <Badge color={cat.color as 'green' | 'blue' | 'red' | 'gray'}>{cat.binColor}</Badge>
              </div>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 mb-4">
              {cat.items.map((item, idx) => {
                const ItemIcon = item.icon;
                return (
                  <div key={idx} className="flex items-center gap-2 p-2 bg-gray-50 rounded-lg">
                    <ItemIcon className={`w-4 h-4 ${cat.iconClass} flex-shrink-0`} />
                    <span className="text-xs text-gray-700">{item.label}</span>
                  </div>
                );
              })}
            </div>

            <div className={`p-3 ${cat.bgClass} rounded-lg`}>
              <p className="text-xs text-gray-600">
                <span className="font-semibold">How it's processed: </span>
                {cat.process}
              </p>
            </div>
          </Card>
        );
      })}

      {/* Tips */}
      <Card className="p-5 bg-gradient-to-r from-teal-700 to-emerald-700 text-white">
        <h3 className="font-bold mb-3 flex items-center gap-2">
          <Recycle className="w-5 h-5" /> Segregation Tips
        </h3>
        <ul className="space-y-2 text-sm text-teal-50">
          <li className="flex items-start gap-2"><span className="text-yellow-400 mt-0.5">•</span> Rinse containers before disposing them in the recyclable bin</li>
          <li className="flex items-start gap-2"><span className="text-yellow-400 mt-0.5">•</span> Store hazardous waste separately and never mix with other waste</li>
          <li className="flex items-start gap-2"><span className="text-yellow-400 mt-0.5">•</span> Use cloth or jute bags instead of plastic carry bags</li>
          <li className="flex items-start gap-2"><span className="text-yellow-400 mt-0.5">•</span> Compost your organic waste at home if possible</li>
          <li className="flex items-start gap-2"><span className="text-yellow-400 mt-0.5">•</span> Flatten cardboard boxes to save space in the recycling bin</li>
          <li className="flex items-start gap-2"><span className="text-yellow-400 mt-0.5">•</span> Keep e-waste separate and hand it over during special e-waste collection drives</li>
        </ul>
      </Card>
    </div>
  );
}
