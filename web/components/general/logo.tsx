import { HEADER_FONT } from "@/app/constants/font"

export default function Logo() {
  return (
    <div className='flex gap-8 items-center mb-8 text-6xl font-extrabold [-webkit-text-stroke:2px_black] [paint-order:stroke_fill] drop-shadow-[4px_4px_0_#000]'>
      <h1
        className={`${HEADER_FONT.className}  text-center text-transparent bg-clip-text bg-[linear-gradient(180deg,var(--brand-yellow)_0%,var(--brand-yellow)_32%,var(--brand-pink)_68%,var(--brand-pink)_100%)] [background-size:100%_100%] `}
      >
        Knockouts!
      </h1>
    </div>
  )
}
