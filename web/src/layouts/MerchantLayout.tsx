import { MobileSimulatorLayout } from './MobileSimulatorLayout'
import { merchantLinks } from './DeskLayout'

export function MerchantLayout() {
  return <MobileSimulatorLayout panelType="merchant" sideLinks={merchantLinks} />
}

