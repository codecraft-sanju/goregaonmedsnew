// src/components/home/Locations.tsx

import { MapPin, Plus, Navigation, ArrowUpRight } from 'lucide-react';
import { BRANCHES, TONE_STYLES } from '@/lib/constants';
import { Reveal } from './Reveal';

// Utility classes exact as they were in the Page.tsx reference
const EYEBROW = "inline-flex items-center gap-2 text-[8px] font-bold uppercase tracking-[1.4px] md:text-[10px] md:tracking-[1.9px]";
const SPLIT_H2 = "mt-4 font-serif text-[36px] font-medium italic leading-[1.12] tracking-[-1.5px] lg:text-[45px]";
const CONTAINER = "mx-auto w-[calc(100%-28px)] min-[361px]:w-[calc(100%-36px)] sm:w-[calc(100%-48px)] lg:w-[min(1180px,calc(100%-80px))]";
const SECTION = "py-[52px] sm:py-[65px] md:py-[95px]";
const SCROLL_OFFSET = "scroll-mt-[88px] sm:scroll-mt-[105px]";

function OpenAllHoursBadge({ compact = false }: { compact?: boolean }) {
  return (
    <span
      className={`inline-flex shrink-0 items-center gap-1.5 rounded-full bg-[#153f34] font-bold uppercase text-[#d8ef8d] ${
        compact ? "px-2 py-0.5 text-[8px] tracking-[0.8px]" : "px-2.5 py-1 text-[9px] tracking-[1px]"
      }`}
    >
      <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-[#d8ef8d]" aria-hidden="true" />
      Open 24×7
    </span>
  );
}

export function Locations() {
  return (
    // यहाँ `hidden md:block` जोड़ा गया है
    <section id="locations" className={`hidden md:block ${CONTAINER} ${SECTION} ${SCROLL_OFFSET}`}>
      <Reveal className="mb-7 sm:flex sm:items-end sm:justify-between sm:gap-6 md:mb-9">
        <div>
          <span className={EYEBROW}>AROUND THE CORNER</span>
          <h2 className={SPLIT_H2}>Three branches. One neighbourhood.</h2>
        </div>
        <p className="mt-[18px] text-xs leading-[1.9] text-[#6b7766] sm:mt-0 sm:pb-1 sm:text-[11px] md:text-[13px]">
          Familiar faces, local care.
          <br />
          Find the branch closest to you.
        </p>
      </Reveal>

      <div className="grid grid-cols-1 gap-5 sm:grid-cols-3 sm:gap-3 lg:gap-[22px]">
        {BRANCHES.map((item, index) => (
          <Reveal
            key={item.name}
            delay={index * 0.15}
            className={`overflow-hidden rounded-[18px] border bg-white ${
              item.open24x7 ? "border-[#b8cf98] shadow-[0_10px_30px_#153f340d]" : "border-[#e0e5da]"
            }`}
          >
            <div
              className={`relative h-[185px] overflow-hidden sm:h-[170px] lg:h-[196px] ${TONE_STYLES[item.tone].art}`}
              aria-hidden="true"
            >
              <span className="absolute left-5 top-[18px] text-[8px] tracking-[1.4px] sm:left-3 sm:text-[6px] lg:left-5 lg:top-[17px] lg:text-[8px]">
                0{index + 1} / GOREGAON EAST
              </span>
              <div className="absolute -bottom-[5px] left-[calc(50%-95px)] w-[190px] rounded-t-[5px] border border-[#95a689] bg-[#f8faf3] shadow-[10px_6px_0_#8c9e7528] sm:left-[calc(50%-72px)] sm:w-[145px] lg:left-[calc(50%-89px)] lg:w-[178px]">
                <div
                  className={`flex h-[34px] items-center justify-center gap-[5px] rounded-t text-[10px] font-[650] text-white sm:text-[7px] lg:text-[9px] ${TONE_STYLES[item.tone].sign}`}
                >
                  <Plus size={16} />
                  {item.name}
                </div>
                <div className="-ml-[5px] h-5 w-[calc(100%+10px)] -skew-x-6 border-b border-[#9eac8e] bg-[repeating-linear-gradient(90deg,#d2dfbc_0_17px,#f6f7ec_17px_34px)]" />
                <div className="flex h-[88px] gap-[7px] p-3">
                  <span className="grid flex-1 place-items-center border border-[#aabd9c] bg-[#dce6d1] text-[#6a8559]">
                    <Plus size={31} />
                  </span>
                  <span className="flex-[0.7] border border-[#aabd9c] bg-[#b9caae]" />
                  <span className="flex-1 border border-[#aabd9c] bg-[#dce6d1]" />
                </div>
              </div>
              <span className="absolute bottom-[25px] right-6 grid h-9 w-9 place-items-center rounded-full bg-white shadow-[0_5px_15px_#1e321b15] sm:right-3 sm:h-[30px] sm:w-[30px] lg:bottom-6 lg:right-[22px] lg:h-[37px] lg:w-[37px]">
                <MapPin size={20} className="text-[#153f34]" />
              </span>
            </div>
            
            <div className="p-[23px] sm:p-[15px] md:p-5 lg:p-6">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <span className={`${EYEBROW} text-[8px] tracking-[1.2px] md:text-[8px] md:tracking-[1.2px]`}>
                  {item.area}
                </span>
                {item.open24x7 && <OpenAllHoursBadge compact />}
              </div>
              <h3 className="mt-2 text-[21px] font-[550] tracking-[-0.5px] sm:text-base lg:text-[19px]">{item.name}</h3>
              <p className="mb-[21px] mt-3 text-xs leading-[1.85] text-[#6b7766] sm:mb-[18px] sm:min-h-[130px] sm:text-[10px] md:min-h-[105px] lg:min-h-[83px] lg:text-[11px]">
                {item.address}
              </p>
              <div className="flex justify-between gap-2 border-t border-[#e4e9df] pt-4 sm:flex-col sm:gap-3 md:flex-row md:gap-2">
                <a
                  className="flex min-h-[30px] items-center gap-1.5 text-[11px] font-semibold text-[#153f34] sm:min-h-0 sm:text-[10px]"
                  href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(item.name + ", " + item.address)}`}
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  Get directions <Navigation size={15} />
                </a>
                <a
                  className="flex min-h-[30px] items-center gap-1.5 text-[11px] font-semibold text-[#153f34] hover:text-[#567832] sm:min-h-0 sm:text-[10px]"
                  href="#order"
                >
                  Order here <ArrowUpRight size={17} />
                </a>
              </div>
            </div>
          </Reveal>
        ))}
      </div>
    </section>
  );
}