import { useEffect, useState } from 'react'
import { getFromStorage } from '@/common/storage'
import { callEvent } from '@/common/utils/call-event'
import { ItemSelector } from '@/components/item-selector'
import { TextInput } from '@/components/text-input'
import { ToggleSwitch } from '@/components/toggle-switch.component'
import { BASE_PET_OPTIONS, PetTypes } from '@/layouts/livedash-card/pets/pet.context'

export function PetSettings() {
	const [enablePets, setEnablePets] = useState(true)
	const [petType, setPetType] = useState<PetTypes>(PetTypes.DOG_AKITA)
	const [petName, setPetName] = useState<string>('')

	useEffect(() => {
		async function load() {
			const [storedPets, petState] = await Promise.all([
				getFromStorage('pets'),
				getFromStorage('petState'),
			])
			if (storedPets?.petOptions) {
				const type = storedPets.petType || PetTypes.DOG_AKITA
				setPetType(type)
				setPetName(storedPets.petOptions[type].name)
			}
			if (typeof petState === 'boolean') {
				setEnablePets(petState)
			} else {
				setEnablePets(true)
			}
		}

		load()
	}, [])

	async function onChangeEnablePets(value: boolean) {
		callEvent('updatedPetState', value)
		setEnablePets(value)
	}

	async function onChangePetName(value: string) {
		callEvent('updatedPetSettings', {
			petName: value,
			petType,
		})
		setPetName(value)
	}

	async function onChangePetType(value: PetTypes) {
		const storedPets = await getFromStorage('pets')
		if (storedPets?.petOptions[value]) {
			setPetName(storedPets.petOptions[value].name)
		}
		setPetType(value)

		callEvent('updatedPetSettings', {
			petType: value,
		})
	}
	const persianType: Record<string, string> = {
		dog: 'Dog',
		chicken: 'Chicken',
		crab: 'Crab',
	}
	const availablePets = Object.entries(BASE_PET_OPTIONS.petOptions).map(
		([key, value]) => ({
			value: key as PetTypes,
			label: `${value.emoji} ${persianType[value.type] || ''} - ${value.name}`,
		})
	)

	return (
		<div className="flex flex-col w-full max-w-xl mx-auto">
			<div className="flex items-center justify-between flex-1 gap-3">
				<div className="overflow-hidden">
					<span className={`block truncate`}>Show pet</span>
					<span className={'block text-sm font-light text-muted'}>
						Show an interactive pet on the home page
					</span>
				</div>
				<ToggleSwitch
					enabled={enablePets}
					disabled={false}
					onToggle={() => onChangeEnablePets(!enablePets)}
				/>
			</div>

			<div className={'p-4 mt-4 rounded-lg border border-content'}>
				<p className={'mb-3 font-medium text-content'}>Pet type</p>
				<div className="grid grid-cols-3 gap-1.5 mb-2">
					{availablePets.map((pet) => (
						<ItemSelector
							isActive={petType === pet.value}
							onClick={() => onChangePetType(pet.value)}
							key={pet.value}
							label={pet.label}
							className="!w-full !h-12 !p-2.5 !text-sm text-center"
						/>
					))}
				</div>

				<p className={'mb-3 font-medium text-content'}>Pet name</p>
				<TextInput
					type="text"
					value={petName}
					onChange={(value) => onChangePetName(value)}
					placeholder={'Custom name...'}
				/>

				<div className="p-3 mt-2 border rounded-lg border-primary/30 bg-primary/20">
					<p className="mb-1 text-xs font-medium text-primary">
						💡 Care tips:
					</p>
					<ul className="text-xs text-primary-content space-y-0.5">
						<li>• Click the pet to play with it</li>
						<li>• Click nearby to feed the pet</li>
					</ul>
				</div>
			</div>
		</div>
	)
}
